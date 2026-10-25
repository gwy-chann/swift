package com.swift.modules.pos.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PosCheckoutResponse(
    boolean success,
    UUID transactionId,
    String receiptNumber,
    int itemsCount,
    int partsDecremented,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal totalDue,
    BigDecimal cashTendered,
    BigDecimal changeDue,
    String createdAt
) {}
