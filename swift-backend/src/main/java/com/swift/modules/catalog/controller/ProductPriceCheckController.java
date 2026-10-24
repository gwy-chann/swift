package com.swift.modules.catalog.controller;

import com.swift.modules.catalog.dto.ProductPriceCheckResponse;
import com.swift.modules.catalog.service.ProductPriceCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
@Tag(name = "Inventory Catalog", description = "Realtime SKU / barcode price checking and margin simulation")
public class ProductPriceCheckController {

    private final ProductPriceCheckService productPriceCheckService;

    public ProductPriceCheckController(ProductPriceCheckService productPriceCheckService) {
        this.productPriceCheckService = productPriceCheckService;
    }

    @GetMapping("/pricecheck")
    @Operation(summary = "Instant SKU / Barcode price check with margin simulator")
    public ResponseEntity<ProductPriceCheckResponse> priceCheck(@RequestParam(required = false) String query) {
        ProductPriceCheckResponse response = productPriceCheckService.checkProductPrice(query);
        if (response.success()) {
            return ResponseEntity.ok(response);
        }

        if ("INVALID_QUERY".equals(response.code())) {
            return ResponseEntity.badRequest().body(response);
        }

        if ("PRODUCT_NOT_FOUND".equals(response.code())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
