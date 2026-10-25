package com.swift.modules.pos.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PosCheckoutItemDto(
    @NotBlank(message = "Item type is required")
    String itemType, // 'part' | 'service'

    @NotBlank(message = "Item SKU or code is required")
    String itemSkuOrCode,

    @NotBlank(message = "Item name is required")
    String itemName,

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.00", message = "Unit price cannot be negative")
    BigDecimal unitPrice,

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    Integer quantity,

    @NotNull(message = "Subtotal is required")
    @DecimalMin(value = "0.00", message = "Subtotal cannot be negative")
    BigDecimal subtotal,

    String shelfLocation,
    String bay
) {}
