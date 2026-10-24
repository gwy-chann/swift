package com.swift.modules.motomatcher.service;

import com.swift.modules.motomatcher.dto.AddFitmentRuleRequest;
import com.swift.modules.motomatcher.dto.AddFitmentRuleResponse;
import com.swift.modules.motomatcher.dto.MotorcycleModelDto;
import com.swift.modules.motomatcher.dto.MotoMatcherMatrixDto;

import java.util.List;
import java.util.UUID;

public interface MotoMatcherService {
    List<MotorcycleModelDto> getMotorcycleModels();
    MotoMatcherMatrixDto getFitmentMatrix(UUID modelId, String category, String search);
    AddFitmentRuleResponse addFitmentRule(AddFitmentRuleRequest request);
}
