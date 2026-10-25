package com.swift.modules.pos.service;

import com.swift.modules.pos.dto.PosCheckoutRequest;
import com.swift.modules.pos.dto.PosCheckoutResponse;
import com.swift.modules.pos.dto.TransactionResponse;
import com.swift.modules.services.model.LaborServiceEntity;

import java.util.List;

public interface PosCheckoutService {
    PosCheckoutResponse processCheckout(PosCheckoutRequest request);
    List<TransactionResponse> getRecentTransactions(int limit);
    TransactionResponse getTransactionByReceipt(String receiptNumber);
    List<LaborServiceEntity> getActiveLaborServices();
}
