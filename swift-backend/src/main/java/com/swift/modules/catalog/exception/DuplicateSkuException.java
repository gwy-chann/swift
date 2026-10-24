package com.swift.modules.catalog.exception;

public class DuplicateSkuException extends RuntimeException {
    private final String sku;

    public DuplicateSkuException(String sku) {
        super("Product with SKU \"" + sku + "\" already exists in the catalog.");
        this.sku = sku;
    }

    public String getSku() {
        return sku;
    }
}
