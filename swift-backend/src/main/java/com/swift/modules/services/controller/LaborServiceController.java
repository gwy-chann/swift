package com.swift.modules.services.controller;

import com.swift.modules.services.dto.*;
import com.swift.modules.services.exception.DuplicateServiceCodeException;
import com.swift.modules.services.service.LaborServiceManager;
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
@RequestMapping("/api/v1/services/labor")
@Tag(name = "Workshop Labor Services", description = "Workshop bay flat-rate labor services and audit log schedule")
public class LaborServiceController {

    private final LaborServiceManager laborServiceManager;

    public LaborServiceController(LaborServiceManager laborServiceManager) {
        this.laborServiceManager = laborServiceManager;
    }

    @GetMapping
    @Operation(summary = "List labor services with optional active status, bay, or keyword filter")
    public ResponseEntity<List<LaborServiceResponse>> getLaborServices(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String bay,
            @RequestParam(required = false) String search) {
        List<LaborServiceResponse> services = laborServiceManager.getLaborServices(active, bay, search);
        return ResponseEntity.ok(services);
    }

    @PostMapping
    @Operation(summary = "Register a new workshop bay flat-rate labor service")
    public ResponseEntity<LaborServiceResponse> createLaborService(
            @Valid @RequestBody CreateLaborServiceRequest request) {
        LaborServiceResponse created = laborServiceManager.createLaborService(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get labor service by UUID or uppercase service code")
    public ResponseEntity<LaborServiceResponse> getLaborServiceById(@PathVariable String id) {
        LaborServiceResponse service = laborServiceManager.getLaborServiceByIdOrCode(id);
        return ResponseEntity.ok(service);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update labor service and automatically record rate change audit logs")
    public ResponseEntity<LaborServiceResponse> updateLaborService(
            @PathVariable String id,
            @Valid @RequestBody UpdateLaborServiceRequest request) {
        LaborServiceResponse updated = laborServiceManager.updateLaborService(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Toggle active status for immediate POS catalog inclusion or exclusion")
    public ResponseEntity<LaborServiceResponse> updateLaborServiceStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateLaborServiceStatusRequest request) {
        LaborServiceResponse updated = laborServiceManager.updateLaborServiceStatus(id, request.active());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete labor service by UUID or service code")
    public ResponseEntity<Map<String, Object>> deleteLaborService(@PathVariable String id) {
        laborServiceManager.deleteLaborService(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("id", id);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Query service rate change audit logs")
    public ResponseEntity<List<ServiceRateAuditLogResponse>> getRateAuditLogs(
            @RequestParam(required = false) String serviceId,
            @RequestParam(required = false) String serviceCode) {
        String identifier = (serviceId != null && !serviceId.isBlank()) ? serviceId : serviceCode;
        List<ServiceRateAuditLogResponse> logs = laborServiceManager.getRateAuditLogs(identifier);
        return ResponseEntity.ok(logs);
    }

    @ExceptionHandler(DuplicateServiceCodeException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateServiceCodeException(DuplicateServiceCodeException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("code", "DUPLICATE_CODE");
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
        body.put("error", "Validation failed for one or more fields.");
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
