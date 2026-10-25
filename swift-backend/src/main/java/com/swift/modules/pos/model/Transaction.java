package com.swift.modules.pos.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Master transaction entity mapping public.transactions in PostgreSQL.
 * Records financial and cashier metadata for completed POS checkout sales.
 */
@Entity
@Table(name = "transactions", schema = "public", indexes = {
    @Index(name = "idx_transactions_receipt_number", columnList = "receipt_number", unique = true),
    @Index(name = "idx_transactions_created_at_desc", columnList = "created_at DESC"),
    @Index(name = "idx_transactions_cashier_id", columnList = "cashier_id")
})
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "receipt_number", nullable = false, unique = true)
    private String receiptNumber;

    @Column(name = "cashier_id")
    private UUID cashierId;

    @Column(name = "cashier_name", nullable = false)
    private String cashierName = "Cashier";

    @Column(name = "pricing_mode", nullable = false)
    private String pricingMode = "retail";

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_type")
    private String discountType;

    @Column(name = "discount_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal discountRate = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDue = BigDecimal.ZERO;

    @Column(name = "cash_tendered", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashTendered = BigDecimal.ZERO;

    @Column(name = "change_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal changeDue = BigDecimal.ZERO;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod = "Cash";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TransactionItem> items = new ArrayList<>();

    public Transaction() {}

    public Transaction(String receiptNumber, UUID cashierId, String cashierName, String pricingMode,
                       BigDecimal subtotal, String discountType, BigDecimal discountRate,
                       BigDecimal discountAmount, BigDecimal totalDue, BigDecimal cashTendered,
                       BigDecimal changeDue, String paymentMethod) {
        this.receiptNumber = receiptNumber;
        this.cashierId = cashierId;
        this.cashierName = cashierName != null && !cashierName.isBlank() ? cashierName : "Cashier";
        this.pricingMode = pricingMode != null ? pricingMode : "retail";
        this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
        this.discountType = discountType;
        this.discountRate = discountRate != null ? discountRate : BigDecimal.ZERO;
        this.discountAmount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
        this.totalDue = totalDue != null ? totalDue : BigDecimal.ZERO;
        this.cashTendered = cashTendered != null ? cashTendered : this.totalDue;
        this.changeDue = changeDue != null ? changeDue : BigDecimal.ZERO;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "Cash";
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public void setReceiptNumber(String receiptNumber) {
        this.receiptNumber = receiptNumber;
    }

    public UUID getCashierId() {
        return cashierId;
    }

    public void setCashierId(UUID cashierId) {
        this.cashierId = cashierId;
    }

    public String getCashierName() {
        return cashierName;
    }

    public void setCashierName(String cashierName) {
        this.cashierName = cashierName;
    }

    public String getPricingMode() {
        return pricingMode;
    }

    public void setPricingMode(String pricingMode) {
        this.pricingMode = pricingMode;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getDiscountRate() {
        return discountRate;
    }

    public void setDiscountRate(BigDecimal discountRate) {
        this.discountRate = discountRate;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getTotalDue() {
        return totalDue;
    }

    public void setTotalDue(BigDecimal totalDue) {
        this.totalDue = totalDue;
    }

    public BigDecimal getCashTendered() {
        return cashTendered;
    }

    public void setCashTendered(BigDecimal cashTendered) {
        this.cashTendered = cashTendered;
    }

    public BigDecimal getChangeDue() {
        return changeDue;
    }

    public void setChangeDue(BigDecimal changeDue) {
        this.changeDue = changeDue;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<TransactionItem> getItems() {
        return items;
    }

    public void setItems(List<TransactionItem> items) {
        this.items = items;
    }

    public void addItem(TransactionItem item) {
        this.items.add(item);
        item.setTransaction(this);
    }
}
