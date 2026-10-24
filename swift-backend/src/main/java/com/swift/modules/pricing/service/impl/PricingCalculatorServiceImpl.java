package com.swift.modules.pricing.service.impl;

import com.swift.modules.pricing.service.PricingCalculatorService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingCalculatorServiceImpl implements PricingCalculatorService {

    public static final BigDecimal DEFAULT_WHOLESALE_MARKUP_RATE = new BigDecimal("0.18"); // +18%
    public static final BigDecimal DEFAULT_OEM_RETAIL_MARKUP_RATE = new BigDecimal("0.35"); // +35%
    public static final BigDecimal DEFAULT_AFTERMARKET_RETAIL_MARKUP_RATE = new BigDecimal("0.40"); // +40%

    @Override
    public BigDecimal computeWholesalePrice(BigDecimal cost, BigDecimal explicitWholesale) {
        if (explicitWholesale != null && explicitWholesale.compareTo(BigDecimal.ZERO) > 0) {
            return explicitWholesale.setScale(2, RoundingMode.HALF_UP);
        }
        if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return cost.multiply(BigDecimal.ONE.add(DEFAULT_WHOLESALE_MARKUP_RATE))
                   .setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal computeRetailPrice(BigDecimal cost, Boolean isOem, BigDecimal explicitRetail) {
        if (explicitRetail != null && explicitRetail.compareTo(BigDecimal.ZERO) > 0) {
            return explicitRetail.setScale(2, RoundingMode.HALF_UP);
        }
        if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal markupRate = Boolean.TRUE.equals(isOem)
                ? DEFAULT_OEM_RETAIL_MARKUP_RATE
                : DEFAULT_AFTERMARKET_RETAIL_MARKUP_RATE;

        return cost.multiply(BigDecimal.ONE.add(markupRate))
                   .setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public MarkupPrices computePrices(BigDecimal cost, Boolean isOem, BigDecimal explicitWholesale, BigDecimal explicitRetail) {
        BigDecimal wholesale = computeWholesalePrice(cost, explicitWholesale);
        BigDecimal retail = computeRetailPrice(cost, isOem, explicitRetail);
        return new MarkupPrices(wholesale, retail);
    }
}
