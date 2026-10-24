package com.swift.modules.catalog.controller;

import com.swift.modules.catalog.dto.CreateProductRequest;
import com.swift.modules.catalog.dto.ProductListResponse;
import com.swift.modules.catalog.dto.ProductResponse;
import com.swift.modules.catalog.exception.DuplicateSkuException;
import com.swift.modules.catalog.service.ProductCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/products")
@Tag(name = "Product Catalog Admin", description = "Master catalog management and physical locator tagging")
public class ProductCatalogController {

    private final ProductCatalogService productCatalogService;

    public ProductCatalogController(ProductCatalogService productCatalogService) {
        this.productCatalogService = productCatalogService;
    }

    @PostMapping
    @Operation(summary = "Register new part with automated markup calculation and physical rack/shelf tags")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductResponse response = productCatalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Browse master product catalog with search, category filtering, and shelf tags")
    public ResponseEntity<ProductListResponse> getProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category) {
        List<ProductResponse> products = productCatalogService.getProducts(query, category);
        return ResponseEntity.ok(ProductListResponse.success(products));
    }

    @ExceptionHandler(DuplicateSkuException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateSkuException(DuplicateSkuException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("code", "SKU_ALREADY_EXISTS");
        body.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("code", "VALIDATION_ERROR");
        body.put("error", "Validation failed for one or more product fields.");
        body.put("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
