package com.swift.modules.pos.exception;

public class InsufficientStockException extends RuntimeException {

    private final String sku;
    private final int currentStock;
    private final int requestedQuantity;

    public InsufficientStockException(String sku, int currentStock, int requestedQuantity) {
        super(String.format("Insufficient stock for SKU %s. Current: %d, Requested: %d.",
                sku, currentStock, requestedQuantity));
        this.sku = sku;
        this.currentStock = currentStock;
        this.requestedQuantity = requestedQuantity;
    }

    public String getSku() {
        return sku;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public int getRequestedQuantity() {
        return requestedQuantity;
    }
}
