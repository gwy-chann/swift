package com.swift.modules.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PosCheckoutRequest(
    String receiptNumber,
    UUID cashierId,

    @NotBlank(message = "Cashier name is required")
    String cashierName,

    String pricingMode,

    @NotNull(message = "Subtotal is required")
    @DecimalMin(value = "0.00", message = "Subtotal cannot be negative")
    BigDecimal subtotal,

    String discountType,
    BigDecimal discountRate,
    BigDecimal discountAmount,

    @NotNull(message = "Total due is required")
    @DecimalMin(value = "0.00", message = "Total due cannot be negative")
    BigDecimal totalDue,

    @NotNull(message = "Cash tendered is required")
    @DecimalMin(value = "0.00", message = "Cash tendered cannot be negative")
    BigDecimal cashTendered,

    BigDecimal changeDue,
    String paymentMethod,

    @NotEmpty(message = "Checkout items cannot be empty")
    @Valid
    List<PosCheckoutItemDto> items
) {}
