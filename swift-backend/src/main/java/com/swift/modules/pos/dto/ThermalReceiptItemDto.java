package com.swift.modules.pos.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ThermalReceiptItemDto(
    UUID id,
    String itemType,
    String skuOrCode,
    String name,
    BigDecimal unitPrice,
    int quantity,
    BigDecimal subtotal,
    String shelfLocation,
    String bay,
    String duration
) {}
