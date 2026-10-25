package com.swift.modules.pos.dto;

import com.swift.modules.pos.model.Transaction;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TransactionResponse(
    UUID id,
    String receiptNumber,
    UUID cashierId,
    String cashierName,
    String pricingMode,
    BigDecimal subtotal,
    String discountType,
    BigDecimal discountRate,
    BigDecimal discountAmount,
    BigDecimal totalDue,
    BigDecimal cashTendered,
    BigDecimal changeDue,
    String paymentMethod,
    OffsetDateTime createdAt,
    List<PosCheckoutItemDto> items
) {
    public static TransactionResponse fromEntity(Transaction t) {
        List<PosCheckoutItemDto> itemDtos = t.getItems() != null
            ? t.getItems().stream()
                .map(i -> new PosCheckoutItemDto(
                    i.getItemType(),
                    i.getItemSkuOrCode(),
                    i.getItemName(),
                    i.getUnitPrice(),
                    i.getQuantity(),
                    i.getSubtotal(),
                    i.getShelfLocation(),
                    i.getBay()
                ))
                .toList()
            : List.of();

        return new TransactionResponse(
            t.getId(),
            t.getReceiptNumber(),
            t.getCashierId(),
            t.getCashierName(),
            t.getPricingMode(),
            t.getSubtotal(),
            t.getDiscountType(),
            t.getDiscountRate(),
            t.getDiscountAmount(),
            t.getTotalDue(),
            t.getCashTendered(),
            t.getChangeDue(),
            t.getPaymentMethod(),
            t.getCreatedAt(),
            itemDtos
        );
    }
}
