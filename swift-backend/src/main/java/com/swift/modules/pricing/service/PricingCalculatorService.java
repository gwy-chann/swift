package com.swift.modules.pricing.service;

import java.math.BigDecimal;

public interface PricingCalculatorService {

    record MarkupPrices(BigDecimal wholesale, BigDecimal retail) {}

    BigDecimal computeWholesalePrice(BigDecimal cost, BigDecimal explicitWholesale);

    BigDecimal computeRetailPrice(BigDecimal cost, Boolean isOem, BigDecimal explicitRetail);

    MarkupPrices computePrices(BigDecimal cost, Boolean isOem, BigDecimal explicitWholesale, BigDecimal explicitRetail);
}
