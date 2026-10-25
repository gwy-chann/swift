package com.swift.modules.pos.service.impl;

import com.swift.modules.pos.dto.ThermalReceiptItemDto;
import com.swift.modules.pos.dto.ThermalReceiptResponse;
import com.swift.modules.pos.model.Transaction;
import com.swift.modules.pos.model.TransactionItem;
import com.swift.modules.pos.repository.TransactionRepository;
import com.swift.modules.pos.service.ThermalReceiptService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class ThermalReceiptServiceImpl implements ThermalReceiptService {

    public static final String STORE_NAME = "SWIFT MOTO SERVICE";
    public static final String STORE_ADDRESS = "104 Rizal Ave, Motor City";
    public static final String STORE_TIN = "TIN: 409-281-992-000";
    public static final String STORE_PHONE = "Tel: (02) 8921-4450";
    public static final String WARRANTY_NOTICE = "Parts warranty valid for 7 days with receipt.";
    public static final String CUSTOMER_COPY = "*** CUSTOMER COPY ***";

    private final TransactionRepository transactionRepository;

    public ThermalReceiptServiceImpl(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public ThermalReceiptResponse getThermalReceiptByReceiptNumber(String receiptNumber) {
        Transaction transaction = transactionRepository.findByReceiptNumberWithItems(receiptNumber)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found for receipt: " + receiptNumber));
        return generateThermalReceipt(transaction);
    }

    @Override
    public ThermalReceiptResponse generateThermalReceipt(Transaction transaction) {
        List<ThermalReceiptItemDto> itemDtos = new ArrayList<>();
        if (transaction.getItems() != null) {
            for (TransactionItem item : transaction.getItems()) {
                itemDtos.add(new ThermalReceiptItemDto(
                    item.getId(),
                    item.getItemType(),
                    item.getItemSkuOrCode(),
                    item.getItemName(),
                    item.getUnitPrice(),
                    item.getQuantity(),
                    item.getSubtotal(),
                    item.getShelfLocation(),
                    item.getBay(),
                    "service".equalsIgnoreCase(item.getItemType()) ? "15m" : null
                ));
            }
        }

        String formattedTimestamp = transaction.getCreatedAt() != null
            ? transaction.getCreatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            : "";

        byte[] escPosBytes = buildEscPosPayload(transaction, itemDtos);
        String escPosBase64 = Base64.getEncoder().encodeToString(escPosBytes);
        String escPosPrintable = buildPrintableText(transaction, itemDtos);

        return new ThermalReceiptResponse(
            transaction.getReceiptNumber(),
            formattedTimestamp,
            transaction.getCashierName(),
            transaction.getPricingMode(),
            transaction.getSubtotal(),
            transaction.getDiscountType(),
            transaction.getDiscountRate(),
            transaction.getDiscountAmount(),
            transaction.getTotalDue(),
            transaction.getCashTendered(),
            transaction.getChangeDue(),
            transaction.getPaymentMethod(),
            itemDtos,
            STORE_NAME,
            STORE_ADDRESS,
            STORE_TIN,
            STORE_PHONE,
            WARRANTY_NOTICE,
            CUSTOMER_COPY,
            escPosBase64,
            escPosPrintable
        );
    }

    private byte[] buildEscPosPayload(Transaction tx, List<ThermalReceiptItemDto> items) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // ESC @ (Initialize printer)
            out.write(new byte[]{0x1B, '@'});

            // ESC a 1 (Center align)
            out.write(new byte[]{0x1B, 'a', 1});

            // Double height & width on
            out.write(new byte[]{0x1D, '!', 0x11});
            out.write((STORE_NAME + "\n").getBytes(StandardCharsets.UTF_8));

            // Standard text
            out.write(new byte[]{0x1D, '!', 0x00});
            out.write((STORE_ADDRESS + "\n").getBytes(StandardCharsets.UTF_8));
            out.write((STORE_TIN + "\n").getBytes(StandardCharsets.UTF_8));
            out.write((STORE_PHONE + "\n").getBytes(StandardCharsets.UTF_8));
            out.write((CUSTOMER_COPY + "\n").getBytes(StandardCharsets.UTF_8));
            out.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

            // ESC a 0 (Left align)
            out.write(new byte[]{0x1B, 'a', 0});
            out.write(String.format("Receipt #: %s\n", tx.getReceiptNumber()).getBytes(StandardCharsets.UTF_8));
            out.write(String.format("Cashier:   %s\n", tx.getCashierName()).getBytes(StandardCharsets.UTF_8));
            out.write(String.format("Date:      %s\n", tx.getCreatedAt().toString()).getBytes(StandardCharsets.UTF_8));
            out.write(String.format("Mode:      %s\n", tx.getPricingMode().toUpperCase()).getBytes(StandardCharsets.UTF_8));
            out.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

            // Line items
            for (ThermalReceiptItemDto item : items) {
                out.write(String.format("%s\n", item.name()).getBytes(StandardCharsets.UTF_8));
                out.write(String.format("  %d x PHP %.2f       PHP %.2f\n",
                    item.quantity(), item.unitPrice(), item.subtotal()).getBytes(StandardCharsets.UTF_8));
            }
            out.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

            // Totals (Right align or formatted)
            out.write(String.format("Subtotal:            PHP %.2f\n", tx.getSubtotal()).getBytes(StandardCharsets.UTF_8));
            if (tx.getDiscountAmount() != null && tx.getDiscountAmount().doubleValue() > 0) {
                out.write(String.format("Discount (%s):   -PHP %.2f\n",
                    tx.getDiscountType() != null ? tx.getDiscountType() : "Promo", tx.getDiscountAmount()).getBytes(StandardCharsets.UTF_8));
            }
            out.write(String.format("TOTAL DUE:           PHP %.2f\n", tx.getTotalDue()).getBytes(StandardCharsets.UTF_8));
            out.write(String.format("Cash Tendered:       PHP %.2f\n", tx.getCashTendered()).getBytes(StandardCharsets.UTF_8));
            out.write(String.format("Change Due:          PHP %.2f\n", tx.getChangeDue()).getBytes(StandardCharsets.UTF_8));
            out.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));

            // Footer (Center align)
            out.write(new byte[]{0x1B, 'a', 1});
            out.write((WARRANTY_NOTICE + "\n").getBytes(StandardCharsets.UTF_8));
            out.write("Thank you for choosing SWIFT!\n".getBytes(StandardCharsets.UTF_8));

            // Feed 3 lines & Cut paper (GS V 66 0)
            out.write(new byte[]{0x1B, 'd', 3});
            out.write(new byte[]{0x1D, 'V', 66, 0});

            return out.toByteArray();
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    private String buildPrintableText(Transaction tx, List<ThermalReceiptItemDto> items) {
        StringBuilder sb = new StringBuilder();
        sb.append("================================\n");
        sb.append(String.format("       %s\n", STORE_NAME));
        sb.append(String.format("   %s\n", STORE_ADDRESS));
        sb.append(String.format("     %s\n", STORE_TIN));
        sb.append(String.format("      %s\n", STORE_PHONE));
        sb.append(String.format("    %s\n", CUSTOMER_COPY));
        sb.append("--------------------------------\n");
        sb.append(String.format("Receipt: %s\n", tx.getReceiptNumber()));
        sb.append(String.format("Cashier: %s\n", tx.getCashierName()));
        sb.append(String.format("Date:    %s\n", tx.getCreatedAt().toString()));
        sb.append(String.format("Mode:    %s\n", tx.getPricingMode()));
        sb.append("--------------------------------\n");
        for (ThermalReceiptItemDto item : items) {
            sb.append(String.format("%s\n", item.name()));
            sb.append(String.format("  %d x %.2f = PHP %.2f\n", item.quantity(), item.unitPrice(), item.subtotal()));
        }
        sb.append("--------------------------------\n");
        sb.append(String.format("Subtotal:      PHP %.2f\n", tx.getSubtotal()));
        if (tx.getDiscountAmount() != null && tx.getDiscountAmount().doubleValue() > 0) {
            sb.append(String.format("Discount:     -PHP %.2f\n", tx.getDiscountAmount()));
        }
        sb.append(String.format("TOTAL DUE:     PHP %.2f\n", tx.getTotalDue()));
        sb.append(String.format("Cash Tendered: PHP %.2f\n", tx.getCashTendered()));
        sb.append(String.format("Change Due:    PHP %.2f\n", tx.getChangeDue()));
        sb.append("--------------------------------\n");
        sb.append(String.format("%s\n", WARRANTY_NOTICE));
        sb.append("================================\n");
        return sb.toString();
    }
}
