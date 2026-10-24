package com.swift.modules.catalog.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductPriceCheckResponse(
    boolean success,
    ProductPriceCheckItemDto product,
    String code,
    String error
) {
    public static ProductPriceCheckResponse ok(ProductPriceCheckItemDto product) {
        return new ProductPriceCheckResponse(true, product, null, null);
    }

    public static ProductPriceCheckResponse notFound(String error) {
        return new ProductPriceCheckResponse(false, null, "PRODUCT_NOT_FOUND", error);
    }

    public static ProductPriceCheckResponse invalidQuery(String error) {
        return new ProductPriceCheckResponse(false, null, "INVALID_QUERY", error);
    }

    public static ProductPriceCheckResponse databaseError(String error) {
        return new ProductPriceCheckResponse(false, null, "DATABASE_ERROR", error);
    }
}
