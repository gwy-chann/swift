package com.swift.modules.catalog.service;

import com.swift.modules.catalog.dto.CreateProductRequest;
import com.swift.modules.catalog.dto.ProductResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductCatalogService {

    ProductResponse createProduct(CreateProductRequest request);

    List<ProductResponse> getProducts(String query, String category);

    Optional<ProductResponse> getProductById(UUID id);

    Optional<ProductResponse> getProductBySku(String sku);
}
