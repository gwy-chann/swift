package com.swift.modules.pos.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Line item entity mapping public.transaction_items in PostgreSQL.
 * Represents individual parts or workshop services associated with a transaction.
 */
@Entity
@Table(name = "transaction_items", schema = "public", indexes = {
    @Index(name = "idx_transaction_items_tx_id", columnList = "transaction_id"),
    @Index(name = "idx_transaction_items_sku_code", columnList = "item_sku_or_code")
})
public class TransactionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    @JsonIgnore
    private Transaction transaction;

    @Column(name = "item_type", nullable = false)
    private String itemType; // 'part' | 'service'

    @Column(name = "item_sku_or_code", nullable = false)
    private String itemSkuOrCode;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "bay")
    private String bay;

    @Column(name = "shelf_location")
    private String shelfLocation;

    public TransactionItem() {}

    public TransactionItem(String itemType, String itemSkuOrCode, String itemName,
                           BigDecimal unitPrice, Integer quantity, BigDecimal subtotal,
                           String bay, String shelfLocation) {
        this.itemType = itemType != null ? itemType : "part";
        this.itemSkuOrCode = itemSkuOrCode;
        this.itemName = itemName;
        this.unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        this.quantity = quantity != null ? quantity : 1;
        this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
        this.bay = bay;
        this.shelfLocation = shelfLocation;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public String getItemSkuOrCode() {
        return itemSkuOrCode;
    }

    public void setItemSkuOrCode(String itemSkuOrCode) {
        this.itemSkuOrCode = itemSkuOrCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public String getBay() {
        return bay;
    }

    public void setBay(String bay) {
        this.bay = bay;
    }

    public String getShelfLocation() {
        return shelfLocation;
    }

    public void setShelfLocation(String shelfLocation) {
        this.shelfLocation = shelfLocation;
    }
}
