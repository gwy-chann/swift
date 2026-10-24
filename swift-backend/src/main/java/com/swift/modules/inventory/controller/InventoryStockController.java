package com.swift.modules.inventory.controller;

import com.swift.modules.inventory.dto.StockAdjustmentRequest;
import com.swift.modules.inventory.dto.StockAdjustmentResponse;
import com.swift.modules.inventory.dto.StockAuditLogsResponse;
import com.swift.modules.inventory.exception.InsufficientStockException;
import com.swift.modules.inventory.exception.InvalidAdjustmentException;
import com.swift.modules.inventory.exception.ProductNotFoundException;
import com.swift.modules.inventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventory/stock-adjust")
public class InventoryStockController {

    private final InventoryService inventoryService;

    public InventoryStockController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    public ResponseEntity<StockAdjustmentResponse> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        StockAdjustmentResponse response = inventoryService.adjustProductStock(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/logs")
    public ResponseEntity<StockAuditLogsResponse> getLogs(
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String adjustmentType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        int pageNumber = limit > 0 ? offset / limit : 0;
        int pageSize = limit > 0 ? limit : 50;
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        StockAuditLogsResponse response = inventoryService.getStockAdjustmentLogs(
                sku,
                adjustmentType,
                startDate,
                endDate,
                search,
                pageable
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export-csv")
    public ResponseEntity<StreamingResponseBody> exportCsv(
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String adjustmentType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate
    ) {
        StreamingResponseBody responseBody = inventoryService.exportStockAdjustmentLogsCsv(
                sku,
                adjustmentType,
                startDate,
                endDate
        );

        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String filename = "stock-adjustment-audit-" + timestamp + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(responseBody);
    }

    @ExceptionHandler(InvalidAdjustmentException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidAdjustment(InvalidAdjustmentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "code", ex.getCode(),
                "error", ex.getMessage()
        ));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "code", "INSUFFICIENT_STOCK",
                "error", ex.getMessage(),
                "sku", ex.getSku(),
                "currentStock", ex.getCurrentStock(),
                "requestedDelta", ex.getRequestedDelta()
        ));
    }

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(ProductNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "code", "PRODUCT_NOT_FOUND",
                "error", ex.getMessage(),
                "sku", ex.getSku()
        ));
    }
}
