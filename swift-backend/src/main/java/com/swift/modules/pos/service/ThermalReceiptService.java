package com.swift.modules.pos.service;

import com.swift.modules.pos.dto.ThermalReceiptResponse;
import com.swift.modules.pos.model.Transaction;

public interface ThermalReceiptService {
    ThermalReceiptResponse generateThermalReceipt(Transaction transaction);
    ThermalReceiptResponse getThermalReceiptByReceiptNumber(String receiptNumber);
}
