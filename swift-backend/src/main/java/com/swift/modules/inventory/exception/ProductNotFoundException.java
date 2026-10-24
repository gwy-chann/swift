package com.swift.modules.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProductNotFoundException extends RuntimeException {
    private final String sku;

    public ProductNotFoundException(String sku) {
        super(String.format("Product with SKU %s does not exist in catalog.", sku));
        this.sku = sku;
    }

    public String getSku() {
        return sku;
    }
}
