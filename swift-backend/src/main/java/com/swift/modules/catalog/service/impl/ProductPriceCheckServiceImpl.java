package com.swift.modules.catalog.service.impl;

import com.swift.modules.catalog.dto.ProductPriceCheckItemDto;
import com.swift.modules.catalog.dto.ProductPriceCheckResponse;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.catalog.service.ProductPriceCheckService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ProductPriceCheckServiceImpl implements ProductPriceCheckService {

    private static final Logger log = LoggerFactory.getLogger(ProductPriceCheckServiceImpl.class);

    private final ProductRepository productRepository;

    public ProductPriceCheckServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public ProductPriceCheckResponse checkProductPrice(String query) {
        if (query == null || query.trim().isEmpty()) {
            return ProductPriceCheckResponse.invalidQuery("Product search query cannot be empty.");
        }

        String cleanQuery = query.trim();

        try {
            // 1. Try exact SKU match
            Optional<Product> productOpt = productRepository.findBySkuIgnoreCase(cleanQuery);

            // 2. If not found, try case-insensitive partial name match
            if (productOpt.isEmpty()) {
                productOpt = productRepository.findFirstByNameContainingIgnoreCase(cleanQuery);
            }

            if (productOpt.isEmpty()) {
                return ProductPriceCheckResponse.notFound("No item found for barcode / code: \"" + cleanQuery + "\".");
            }

            Product p = productOpt.get();
            double retail = p.getRetail() != null ? p.getRetail().doubleValue() : 0.0;
            double wholesale = p.getWholesale() != null ? p.getWholesale().doubleValue() : 0.0;
            double cost = p.getCost() != null ? p.getCost().doubleValue() : 0.0;

            double scPwdPrice = Math.round(retail * 0.8 * 100.0) / 100.0;
            double grossMarkupPercent = cost > 0 ? Math.round(((retail - cost) / cost) * 1000.0) / 10.0 : 0.0;
            double wholesaleMarkupPercent = cost > 0 ? Math.round(((wholesale - cost) / cost) * 1000.0) / 10.0 : 0.0;

            String location = (p.getLocation() != null && !p.getLocation().isBlank()) ? p.getLocation() : "Floor Stock";

            ProductPriceCheckItemDto itemDto = new ProductPriceCheckItemDto(
                    p.getId() != null ? p.getId().toString() : p.getSku(),
                    p.getSku(),
                    null,
                    p.getName(),
                    p.getCategory(),
                    p.getBrand(),
                    p.getModel(),
                    p.getStock() != null ? p.getStock() : 0,
                    p.getMinThreshold() != null ? p.getMinThreshold() : 0,
                    location,
                    cost,
                    retail,
                    wholesale,
                    scPwdPrice,
                    grossMarkupPercent,
                    wholesaleMarkupPercent
            );

            return ProductPriceCheckResponse.ok(itemDto);
        } catch (Exception e) {
            log.error("[ProductPriceCheckService] Database query error for query '{}': {}", cleanQuery, e.getMessage(), e);
            return ProductPriceCheckResponse.databaseError("Database error occurred while looking up product: " + e.getMessage());
        }
    }
}
