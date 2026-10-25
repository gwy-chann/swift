package com.swift.modules.pos.controller;

import com.swift.modules.pos.dto.PosCheckoutRequest;
import com.swift.modules.pos.dto.PosCheckoutResponse;
import com.swift.modules.pos.dto.ThermalReceiptResponse;
import com.swift.modules.pos.dto.TransactionResponse;
import com.swift.modules.pos.exception.InsufficientCashException;
import com.swift.modules.pos.exception.InsufficientStockException;
import com.swift.modules.pos.service.PosCheckoutService;
import com.swift.modules.pos.service.ThermalReceiptService;
import com.swift.modules.services.model.LaborServiceEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pos")
@Tag(name = "POS Checkout Engine", description = "High-concurrency POS checkout orchestration, row-level locking, and thermal receipts")
public class PosCheckoutController {

    private final PosCheckoutService posCheckoutService;
    private final ThermalReceiptService thermalReceiptService;

    public PosCheckoutController(PosCheckoutService posCheckoutService,
                                 ThermalReceiptService thermalReceiptService) {
        this.posCheckoutService = posCheckoutService;
        this.thermalReceiptService = thermalReceiptService;
    }

    @PostMapping("/checkout")
    @Operation(summary = "Process atomic POS checkout transaction with row-level stock locking")
    public ResponseEntity<PosCheckoutResponse> checkout(@Valid @RequestBody PosCheckoutRequest request) {
        PosCheckoutResponse response = posCheckoutService.processCheckout(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/transactions")
    @Operation(summary = "Retrieve recent completed POS transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@RequestParam(defaultValue = "20") int limit) {
        List<TransactionResponse> transactions = posCheckoutService.getRecentTransactions(limit);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/transactions/{receiptNumber}")
    @Operation(summary = "Lookup transaction details by receipt number")
    public ResponseEntity<TransactionResponse> getTransactionByReceipt(@PathVariable String receiptNumber) {
        TransactionResponse transaction = posCheckoutService.getTransactionByReceipt(receiptNumber);
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/receipts/{receiptNumber}/thermal")
    @Operation(summary = "Generate formatted ESC/POS and JSON thermal receipt payload")
    public ResponseEntity<ThermalReceiptResponse> getThermalReceipt(@PathVariable String receiptNumber) {
        ThermalReceiptResponse receipt = thermalReceiptService.getThermalReceiptByReceiptNumber(receiptNumber);
        return ResponseEntity.ok(receipt);
    }

    @GetMapping("/services")
    @Operation(summary = "Retrieve active workshop labor services for POS cart insertion")
    public ResponseEntity<List<LaborServiceEntity>> getLaborServices() {
        List<LaborServiceEntity> services = posCheckoutService.getActiveLaborServices();
        return ResponseEntity.ok(services);
    }

    @ExceptionHandler(InsufficientCashException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientCash(InsufficientCashException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", ex.getMessage());
        body.put("code", "INSUFFICIENT_CASH");
        body.put("totalDue", ex.getTotalDue());
        body.put("cashTendered", ex.getCashTendered());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientStock(InsufficientStockException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", ex.getMessage());
        body.put("code", "INSUFFICIENT_STOCK");
        body.put("sku", ex.getSku());
        body.put("currentStock", ex.getCurrentStock());
        body.put("requestedQuantity", ex.getRequestedQuantity());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(IllegalArgumentException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", ex.getMessage());
        body.put("code", "NOT_FOUND");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }
}
