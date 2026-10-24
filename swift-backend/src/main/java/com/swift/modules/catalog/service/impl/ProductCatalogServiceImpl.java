package com.swift.modules.catalog.service.impl;

import com.swift.modules.catalog.dto.CreateProductRequest;
import com.swift.modules.catalog.dto.ProductResponse;
import com.swift.modules.catalog.exception.DuplicateSkuException;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.catalog.service.ProductCatalogService;
import com.swift.modules.pricing.service.PricingCalculatorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductCatalogServiceImpl implements ProductCatalogService {

    private static final Logger log = LoggerFactory.getLogger(ProductCatalogServiceImpl.class);

    private final ProductRepository productRepository;
    private final PricingCalculatorService pricingCalculatorService;

    public ProductCatalogServiceImpl(ProductRepository productRepository,
                                     PricingCalculatorService pricingCalculatorService) {
        this.productRepository = productRepository;
        this.pricingCalculatorService = pricingCalculatorService;
    }

    @Override
    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        String normalizedSku = request.sku().trim().toUpperCase();

        if (productRepository.existsBySkuIgnoreCase(normalizedSku)) {
            log.warn("[ProductCatalogService] Registration conflict: SKU '{}' already exists", normalizedSku);
            throw new DuplicateSkuException(normalizedSku);
        }

        PricingCalculatorService.MarkupPrices prices = pricingCalculatorService.computePrices(
            request.cost(),
            request.oem(),
            request.wholesale(),
            request.retail()
        );

        String rack = (request.rackId() != null && !request.rackId().isBlank())
            ? request.rackId().trim().toUpperCase() : null;
        String shelf = (request.shelfId() != null && !request.shelfId().isBlank())
            ? request.shelfId().trim().toUpperCase() : null;
        String bin = (request.binLocator() != null && !request.binLocator().isBlank())
            ? request.binLocator().trim().toUpperCase() : null;

        String location = (request.location() != null && !request.location().isBlank())
            ? request.location().trim() : null;
        if (location == null) {
            if (rack != null && shelf != null) {
                location = "Rack " + rack + " / Shelf " + shelf;
            } else if (rack != null) {
                location = "Rack " + rack;
            } else if (bin != null) {
                location = bin;
            }
        }

        Product product = new Product();
        product.setSku(normalizedSku);
        product.setName(request.name().trim());
        product.setCategory(request.category().trim());
        product.setBrand(request.brand().trim());
        product.setModel(request.model() != null && !request.model().isBlank() ? request.model().trim() : "Universal");
        product.setCost(request.cost().setScale(2, RoundingMode.HALF_UP));
        product.setWholesale(prices.wholesale());
        product.setRetail(prices.retail());
        product.setStock(request.stock() != null ? request.stock() : 0);
        product.setMinThreshold(request.minThreshold() != null ? request.minThreshold() : 5);
        product.setRackId(rack);
        product.setShelfId(shelf);
        product.setBinLocator(bin);
        product.setLocation(location);
        product.setOem(Boolean.TRUE.equals(request.oem()));
        product.setImageUrl(request.imageUrl() != null && !request.imageUrl().isBlank() ? request.imageUrl().trim() : null);
        product.setDescription(request.description() != null && !request.description().isBlank() ? request.description().trim() : null);

        OffsetDateTime now = OffsetDateTime.now();
        product.setCreatedAt(now);
        product.setUpdatedAt(now);

        Product saved = productRepository.save(product);
        log.info("[ProductCatalogService] Created product id '{}' sku '{}' with rack '{}' shelf '{}'",
            saved.getId(), saved.getSku(), saved.getRackId(), saved.getShelfId());

        return ProductResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getProducts(String query, String category) {
        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;
        String cleanCategory = (category != null && !category.isBlank()) ? category.trim() : null;

        List<Product> products = productRepository.searchProducts(cleanQuery, cleanCategory);
        return products.stream().map(ProductResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProductResponse> getProductById(UUID id) {
        return productRepository.findById(id).map(ProductResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProductResponse> getProductBySku(String sku) {
        if (sku == null || sku.isBlank()) return Optional.empty();
        return productRepository.findBySkuIgnoreCase(sku.trim()).map(ProductResponse::fromEntity);
    }
}
