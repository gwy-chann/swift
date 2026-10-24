package com.swift.modules.catalog.dto;

import java.util.List;

public record ProductListResponse(
    boolean success,
    List<ProductResponse> products,
    int totalCount,
    String error
) {
    public static ProductListResponse success(List<ProductResponse> products) {
        return new ProductListResponse(true, products, products != null ? products.size() : 0, null);
    }

    public static ProductListResponse error(String error) {
        return new ProductListResponse(false, List.of(), 0, error);
    }
}
