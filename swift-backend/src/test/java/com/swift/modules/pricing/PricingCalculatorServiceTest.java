package com.swift.modules.pricing;

import com.swift.modules.pricing.service.PricingCalculatorService;
import com.swift.modules.pricing.service.impl.PricingCalculatorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PricingCalculatorServiceTest {

    private PricingCalculatorService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingCalculatorServiceImpl();
    }

    @Test
    @DisplayName("Should compute 18% wholesale markup and 35% OEM retail markup matching SIAA-91 scenario")
    void shouldComputeMarkupsForCost250() {
        BigDecimal cost = new BigDecimal("250.00");
        PricingCalculatorService.MarkupPrices prices = pricingService.computePrices(cost, true, null, null);

        // 250 * 1.18 = 295.00
        assertEquals(new BigDecimal("295.00"), prices.wholesale());
        // 250 * 1.35 = 337.50
        assertEquals(new BigDecimal("337.50"), prices.retail());
    }

    @Test
    @DisplayName("Should compute 40% retail markup for aftermarket parts")
    void shouldComputeAftermarketRetailMarkup() {
        BigDecimal cost = new BigDecimal("250.00");
        BigDecimal retail = pricingService.computeRetailPrice(cost, false, null);

        // 250 * 1.40 = 350.00
        assertEquals(new BigDecimal("350.00"), retail);
    }

    @Test
    @DisplayName("Should respect explicit wholesale and retail prices when provided")
    void shouldRespectExplicitPrices() {
        BigDecimal cost = new BigDecimal("250.00");
        BigDecimal explicitWholesale = new BigDecimal("310.00");
        BigDecimal explicitRetail = new BigDecimal("380.00");

        PricingCalculatorService.MarkupPrices prices = pricingService.computePrices(cost, true, explicitWholesale, explicitRetail);

        assertEquals(new BigDecimal("310.00"), prices.wholesale());
        assertEquals(new BigDecimal("380.00"), prices.retail());
    }

    @Test
    @DisplayName("Should return 0.00 for non-positive or null costs")
    void shouldReturnZeroForNonPositiveCost() {
        PricingCalculatorService.MarkupPrices zeroPrices = pricingService.computePrices(BigDecimal.ZERO, true, null, null);
        assertEquals(new BigDecimal("0.00"), zeroPrices.wholesale());
        assertEquals(new BigDecimal("0.00"), zeroPrices.retail());

        PricingCalculatorService.MarkupPrices nullPrices = pricingService.computePrices(null, false, null, null);
        assertEquals(new BigDecimal("0.00"), nullPrices.wholesale());
        assertEquals(new BigDecimal("0.00"), nullPrices.retail());
    }
}
