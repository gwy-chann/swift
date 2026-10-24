package com.swift.modules.catalog.service;

import com.swift.modules.catalog.dto.ProductPriceCheckResponse;

public interface ProductPriceCheckService {
    ProductPriceCheckResponse checkProductPrice(String query);
}
