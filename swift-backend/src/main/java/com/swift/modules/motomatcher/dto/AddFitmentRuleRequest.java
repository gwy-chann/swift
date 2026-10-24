package com.swift.modules.motomatcher.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddFitmentRuleRequest(
    @NotNull UUID productId,
    @NotNull UUID modelId,
    String fitmentType,
    String yearRange,
    String notes
) {}
