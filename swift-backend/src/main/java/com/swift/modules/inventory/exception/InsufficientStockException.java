package com.swift.modules.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InsufficientStockException extends RuntimeException {
    private final String sku;
    private final int currentStock;
    private final int requestedDelta;

    public InsufficientStockException(String sku, int currentStock, int requestedDelta) {
        super(String.format("Insufficient stock for SKU %s. Current: %d, Requested Delta: %d.", sku, currentStock, requestedDelta));
        this.sku = sku;
        this.currentStock = currentStock;
        this.requestedDelta = requestedDelta;
    }

    public String getSku() {
        return sku;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public int getRequestedDelta() {
        return requestedDelta;
    }
}
