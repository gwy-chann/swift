package com.swift.modules.motomatcher.controller;

import com.swift.modules.motomatcher.dto.AddFitmentRuleRequest;
import com.swift.modules.motomatcher.dto.AddFitmentRuleResponse;
import com.swift.modules.motomatcher.dto.MotorcycleModelDto;
import com.swift.modules.motomatcher.dto.MotoMatcherMatrixDto;
import com.swift.modules.motomatcher.service.MotoMatcherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/motomatcher")
@Tag(name = "MotoMatcher", description = "Motorcycle compatibility matrix, models catalog, and fitment rules")
public class MotoMatcherController {

    private final MotoMatcherService motoMatcherService;

    public MotoMatcherController(MotoMatcherService motoMatcherService) {
        this.motoMatcherService = motoMatcherService;
    }

    @GetMapping("/models")
    @Operation(summary = "Get all motorcycle models (Caffeine cached)")
    public ResponseEntity<List<MotorcycleModelDto>> getModels() {
        List<MotorcycleModelDto> models = motoMatcherService.getMotorcycleModels();
        return ResponseEntity.ok(models);
    }

    @GetMapping("/matrix")
    @Operation(summary = "Get partitioned OEM vs Aftermarket fitment matrix via PostgreSQL stored procedure")
    public ResponseEntity<MotoMatcherMatrixDto> getMatrix(
            @RequestParam(required = false) UUID modelId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        MotoMatcherMatrixDto matrix = motoMatcherService.getFitmentMatrix(modelId, category, search);
        return ResponseEntity.ok(matrix);
    }

    @PostMapping("/rules")
    @Operation(summary = "Add a new motorcycle fitment rule (evicts motorcycleModels cache)")
    public ResponseEntity<AddFitmentRuleResponse> addRule(@Valid @RequestBody AddFitmentRuleRequest request) {
        AddFitmentRuleResponse response = motoMatcherService.addFitmentRule(request);
        if (response.success()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
