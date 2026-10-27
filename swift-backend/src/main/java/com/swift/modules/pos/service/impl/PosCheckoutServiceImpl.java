package com.swift.modules.pos.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.model.StockAdjustmentLog;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import com.swift.modules.pos.dto.*;
import com.swift.modules.pos.exception.InsufficientCashException;
import com.swift.modules.pos.exception.InsufficientStockException;
import com.swift.modules.pos.model.Transaction;
import com.swift.modules.pos.model.TransactionItem;
import com.swift.modules.pos.repository.TransactionRepository;
import com.swift.modules.pos.service.PosCheckoutService;
import com.swift.modules.pos.service.PosStoredProcedureWrapper;
import com.swift.modules.services.model.LaborServiceEntity;
import com.swift.modules.services.repository.LaborServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PosCheckoutServiceImpl implements PosCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(PosCheckoutServiceImpl.class);

    private final TransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final StockAdjustmentLogRepository stockAdjustmentLogRepository;
    private final LaborServiceRepository laborServiceRepository;
    private final PosStoredProcedureWrapper storedProcedureWrapper;
    private final ObjectMapper objectMapper;

    public PosCheckoutServiceImpl(TransactionRepository transactionRepository,
                                  ProductRepository productRepository,
                                  StockAdjustmentLogRepository stockAdjustmentLogRepository,
                                  LaborServiceRepository laborServiceRepository,
                                  PosStoredProcedureWrapper storedProcedureWrapper,
                                  ObjectMapper objectMapper) {
        this.transactionRepository = transactionRepository;
        this.productRepository = productRepository;
        this.stockAdjustmentLogRepository = stockAdjustmentLogRepository;
        this.laborServiceRepository = laborServiceRepository;
        this.storedProcedureWrapper = storedProcedureWrapper;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public PosCheckoutResponse processCheckout(PosCheckoutRequest request) {
        BigDecimal changeDue = validateAndCalculateChangeDue(request);
        String receiptNumber = resolveReceiptNumber(request.receiptNumber());

        Optional<PosCheckoutResponse> spResult = tryStoredProcedureCheckout(request, receiptNumber, changeDue);
        if (spResult.isPresent()) {
            return spResult.get();
        }

        return executeJpaFallback(request, receiptNumber, changeDue);
    }

    private BigDecimal validateAndCalculateChangeDue(PosCheckoutRequest request) {
        if (request.cashTendered() == null || request.cashTendered().compareTo(request.totalDue()) < 0) {
            throw new InsufficientCashException(request.totalDue(), request.cashTendered() != null ? request.cashTendered() : BigDecimal.ZERO);
        }
        return request.cashTendered().subtract(request.totalDue()).setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveReceiptNumber(String receiptNumber) {
        if (receiptNumber != null && !receiptNumber.trim().isEmpty()) {
            return receiptNumber;
        }
        String datePart = DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now(ZoneOffset.UTC));
        int randomSuffix = ThreadLocalRandom.current().nextInt(1000, 10000);
        return String.format("REC-%s-%04d", datePart, randomSuffix);
    }

    private Optional<PosCheckoutResponse> tryStoredProcedureCheckout(
            PosCheckoutRequest request, String receiptNumber, BigDecimal changeDue) {
        try {
            Map<String, Object> txPayload = buildTransactionPayload(request, receiptNumber, changeDue);
            List<Map<String, Object>> itemsPayload = buildItemsPayload(request.items());

            String txJson = objectMapper.writeValueAsString(txPayload);
            String itemsJson = objectMapper.writeValueAsString(itemsPayload);

            Optional<JsonNode> spResult = storedProcedureWrapper.callProcessPosCheckout(txJson, itemsJson);
            if (spResult.isPresent()) {
                return Optional.of(parseStoredProcedureResponse(spResult.get(), request, receiptNumber, changeDue));
            }
        } catch (Exception ex) {
            String msg = ex.getMessage();
            if (msg != null && msg.contains("INSUFFICIENT_STOCK")) {
                throw new InsufficientStockException("UNKNOWN", 0, 1);
            }
            log.debug("Falling back to transactional JPA execution: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    private Map<String, Object> buildTransactionPayload(
            PosCheckoutRequest request, String receiptNumber, BigDecimal changeDue) {
        Map<String, Object> txPayload = new HashMap<>();
        txPayload.put("receipt_number", receiptNumber);
        txPayload.put("cashier_id", request.cashierId());
        txPayload.put("cashier_name", request.cashierName());
        txPayload.put("pricing_mode", request.pricingMode() != null ? request.pricingMode() : "retail");
        txPayload.put("subtotal", request.subtotal());
        txPayload.put("discount_type", request.discountType());
        txPayload.put("discount_rate", request.discountRate() != null ? request.discountRate() : BigDecimal.ZERO);
        txPayload.put("discount_amount", request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO);
        txPayload.put("total_due", request.totalDue());
        txPayload.put("cash_tendered", request.cashTendered());
        txPayload.put("change_due", changeDue);
        txPayload.put("payment_method", request.paymentMethod() != null ? request.paymentMethod() : "Cash");
        return txPayload;
    }

    private List<Map<String, Object>> buildItemsPayload(List<PosCheckoutItemDto> items) {
        List<Map<String, Object>> itemsPayload = new ArrayList<>();
        for (PosCheckoutItemDto item : items) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("item_type", item.itemType());
            itemMap.put("item_sku_or_code", item.itemSkuOrCode());
            itemMap.put("item_name", item.itemName());
            itemMap.put("unit_price", item.unitPrice());
            itemMap.put("quantity", item.quantity());
            itemMap.put("subtotal", item.subtotal());
            itemMap.put("shelf_location", item.shelfLocation());
            itemMap.put("bay", item.bay());
            itemsPayload.add(itemMap);
        }
        return itemsPayload;
    }

    private PosCheckoutResponse parseStoredProcedureResponse(
            JsonNode res, PosCheckoutRequest request, String receiptNumber, BigDecimal changeDue) {
        UUID txId = UUID.fromString(res.path("transaction_id").asText());
        String resReceipt = res.path("receipt_number").asText(receiptNumber);
        int itemsCount = res.path("items_count").asInt(request.items().size());
        int partsDecremented = res.path("parts_decremented").asInt();
        String createdAt = res.path("created_at").asText(OffsetDateTime.now(ZoneOffset.UTC).toString());

        return new PosCheckoutResponse(
            true,
            txId,
            resReceipt,
            itemsCount,
            partsDecremented,
            request.subtotal(),
            request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO,
            request.totalDue(),
            request.cashTendered(),
            changeDue,
            createdAt
        );
    }

    private PosCheckoutResponse executeJpaFallback(
            PosCheckoutRequest request, String receiptNumber, BigDecimal changeDue) {
        int partsDecremented = decrementInventoryForItems(request, receiptNumber);

        Transaction transaction = Transaction.builder()
            .receiptNumber(receiptNumber)
            .cashierId(request.cashierId())
            .cashierName(request.cashierName())
            .pricingMode(request.pricingMode())
            .subtotal(request.subtotal())
            .discountType(request.discountType())
            .discountRate(request.discountRate())
            .discountAmount(request.discountAmount())
            .totalDue(request.totalDue())
            .cashTendered(request.cashTendered())
            .changeDue(changeDue)
            .paymentMethod(request.paymentMethod())
            .build();

        for (PosCheckoutItemDto item : request.items()) {
            TransactionItem lineItem = new TransactionItem(
                item.itemType(),
                item.itemSkuOrCode(),
                item.itemName(),
                item.unitPrice(),
                item.quantity(),
                item.subtotal(),
                item.bay(),
                item.shelfLocation()
            );
            transaction.addItem(lineItem);
        }

        Transaction savedTx = transactionRepository.save(transaction);

        return new PosCheckoutResponse(
            true,
            savedTx.getId(),
            savedTx.getReceiptNumber(),
            request.items().size(),
            partsDecremented,
            savedTx.getSubtotal(),
            savedTx.getDiscountAmount(),
            savedTx.getTotalDue(),
            savedTx.getCashTendered(),
            savedTx.getChangeDue(),
            savedTx.getCreatedAt().toString()
        );
    }

    private int decrementInventoryForItems(PosCheckoutRequest request, String receiptNumber) {
        List<PosCheckoutItemDto> sortedItems = new ArrayList<>(request.items());
        sortedItems.sort(Comparator.comparing(PosCheckoutItemDto::itemSkuOrCode));

        int partsDecremented = 0;
        for (PosCheckoutItemDto item : sortedItems) {
            if ("part".equalsIgnoreCase(item.itemType())) {
                decrementPartStock(item, request, receiptNumber);
                partsDecremented++;
            }
        }
        return partsDecremented;
    }

    private void decrementPartStock(PosCheckoutItemDto item, PosCheckoutRequest request, String receiptNumber) {
        Product product = productRepository.findWithPessimisticLockBySku(item.itemSkuOrCode())
            .orElseThrow(() -> new IllegalArgumentException("Product not found with SKU: " + item.itemSkuOrCode()));

        int currentStock = product.getStock() != null ? product.getStock() : 0;
        int requestedQty = item.quantity() != null ? item.quantity() : 1;

        if (currentStock < requestedQty) {
            throw new InsufficientStockException(item.itemSkuOrCode(), currentStock, requestedQty);
        }

        int newStock = currentStock - requestedQty;
        product.setStock(newStock);
        productRepository.save(product);

        StockAdjustmentLog auditLog = new StockAdjustmentLog(
            null,
            item.itemSkuOrCode(),
            "POS Sale",
            -requestedQty,
            currentStock,
            newStock,
            "POS Sale Receipt: " + receiptNumber,
            request.cashierId(),
            request.cashierName(),
            OffsetDateTime.now(ZoneOffset.UTC)
        );
        stockAdjustmentLogRepository.save(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecentTransactions(int limit) {
        int effectiveLimit = limit > 0 ? Math.min(limit, 100) : 20;
        return transactionRepository.findAllWithItemsOrderByCreatedAtDesc(PageRequest.of(0, effectiveLimit))
            .stream()
            .map(TransactionResponse::fromEntity)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionByReceipt(String receiptNumber) {
        return transactionRepository.findByReceiptNumberWithItems(receiptNumber)
            .map(TransactionResponse::fromEntity)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found for receipt: " + receiptNumber));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LaborServiceEntity> getActiveLaborServices() {
        return laborServiceRepository.findByActiveOrderByCodeAsc(true);
    }
}
