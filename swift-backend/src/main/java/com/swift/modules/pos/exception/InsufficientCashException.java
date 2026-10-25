package com.swift.modules.pos.exception;

import java.math.BigDecimal;

public class InsufficientCashException extends RuntimeException {

    private final BigDecimal totalDue;
    private final BigDecimal cashTendered;

    public InsufficientCashException(BigDecimal totalDue, BigDecimal cashTendered) {
        super(String.format("Insufficient cash tendered. Total due: %.2f, Cash tendered: %.2f",
                totalDue, cashTendered));
        this.totalDue = totalDue;
        this.cashTendered = cashTendered;
    }

    public BigDecimal getTotalDue() {
        return totalDue;
    }

    public BigDecimal getCashTendered() {
        return cashTendered;
    }
}
