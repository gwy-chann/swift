package com.swift.modules.catalog.dto;

public record ProductPriceCheckItemDto(
    String id,
    String sku,
    String barcode,
    String name,
    String category,
    String brand,
    String model,
    Integer stock,
    Integer minThreshold,
    String location,
    Double cost,
    Double retailPrice,
    Double wholesalePrice,
    Double scPwdPrice,
    Double grossMarkupPercent,
    Double wholesaleMarkupPercent
) {}
