package com.swift.modules.pos.dto;

import java.math.BigDecimal;
import java.util.List;

public record ThermalReceiptResponse(
    String receiptNumber,
    String timestamp,
    String cashierName,
    String pricingMode,
    BigDecimal subtotal,
    String discountType,
    BigDecimal discountRate,
    BigDecimal discountAmount,
    BigDecimal totalDue,
    BigDecimal cashTendered,
    BigDecimal changeDue,
    String paymentMethod,
    List<ThermalReceiptItemDto> items,
    String storeName,
    String address,
    String tin,
    String phone,
    String warrantyNotice,
    String customerCopyNotice,
    String escPosBase64,
    String escPosPrintable
) {}
