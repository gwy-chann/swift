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

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String receiptNumber;
        private UUID cashierId;
        private String cashierName = "Cashier";
        private String pricingMode = "retail";
        private BigDecimal subtotal = BigDecimal.ZERO;
        private String discountType;
        private BigDecimal discountRate = BigDecimal.ZERO;
        private BigDecimal discountAmount = BigDecimal.ZERO;
        private BigDecimal totalDue = BigDecimal.ZERO;
        private BigDecimal cashTendered;
        private BigDecimal changeDue = BigDecimal.ZERO;
        private String paymentMethod = "Cash";

        public Builder receiptNumber(String receiptNumber) {
            this.receiptNumber = receiptNumber;
            return this;
        }

        public Builder cashierId(UUID cashierId) {
            this.cashierId = cashierId;
            return this;
        }

        public Builder cashierName(String cashierName) {
            this.cashierName = cashierName != null && !cashierName.isBlank() ? cashierName : "Cashier";
            return this;
        }

        public Builder pricingMode(String pricingMode) {
            this.pricingMode = pricingMode != null ? pricingMode : "retail";
            return this;
        }

        public Builder subtotal(BigDecimal subtotal) {
            this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
            return this;
        }

        public Builder discountType(String discountType) {
            this.discountType = discountType;
            return this;
        }

        public Builder discountRate(BigDecimal discountRate) {
            this.discountRate = discountRate != null ? discountRate : BigDecimal.ZERO;
            return this;
        }

        public Builder discountAmount(BigDecimal discountAmount) {
            this.discountAmount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
            return this;
        }

        public Builder totalDue(BigDecimal totalDue) {
            this.totalDue = totalDue != null ? totalDue : BigDecimal.ZERO;
            return this;
        }

        public Builder cashTendered(BigDecimal cashTendered) {
            this.cashTendered = cashTendered;
            return this;
        }

        public Builder changeDue(BigDecimal changeDue) {
            this.changeDue = changeDue != null ? changeDue : BigDecimal.ZERO;
            return this;
        }

        public Builder paymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod != null ? paymentMethod : "Cash";
            return this;
        }

        public Transaction build() {
            Transaction tx = new Transaction();
            tx.setReceiptNumber(this.receiptNumber);
            tx.setCashierId(this.cashierId);
            tx.setCashierName(this.cashierName);
            tx.setPricingMode(this.pricingMode);
            tx.setSubtotal(this.subtotal);
            tx.setDiscountType(this.discountType);
            tx.setDiscountRate(this.discountRate);
            tx.setDiscountAmount(this.discountAmount);
            tx.setTotalDue(this.totalDue);
            tx.setCashTendered(this.cashTendered != null ? this.cashTendered : this.totalDue);
            tx.setChangeDue(this.changeDue);
            tx.setPaymentMethod(this.paymentMethod);
            tx.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
            return tx;
        }
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
