package com.swift.modules.motomatcher.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.config.CacheConfig;
import com.swift.modules.motomatcher.dto.AddFitmentRuleRequest;
import com.swift.modules.motomatcher.dto.AddFitmentRuleResponse;
import com.swift.modules.motomatcher.dto.MotorcycleModelDto;
import com.swift.modules.motomatcher.dto.MotoMatcherMatrixDto;
import com.swift.modules.motomatcher.model.MotorcycleModel;
import com.swift.modules.motomatcher.model.ProductFitment;
import com.swift.modules.motomatcher.repository.MotorcycleModelRepository;
import com.swift.modules.motomatcher.repository.ProductFitmentRepository;
import com.swift.modules.motomatcher.service.MotoMatcherService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MotoMatcherServiceImpl implements MotoMatcherService {

    private static final Logger log = LoggerFactory.getLogger(MotoMatcherServiceImpl.class);

    private final MotorcycleModelRepository motorcycleModelRepository;
    private final ProductFitmentRepository productFitmentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public MotoMatcherServiceImpl(MotorcycleModelRepository motorcycleModelRepository,
                                  ProductFitmentRepository productFitmentRepository,
                                  JdbcTemplate jdbcTemplate,
                                  ObjectMapper objectMapper) {
        this.motorcycleModelRepository = motorcycleModelRepository;
        this.productFitmentRepository = productFitmentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Cacheable(value = CacheConfig.CACHE_MOTORCYCLE_MODELS, key = "'all'")
    public List<MotorcycleModelDto> getMotorcycleModels() {
        log.info("[MotoMatcherService] Fetching motorcycle models from database (cache miss)");
        List<MotorcycleModel> models = motorcycleModelRepository.findAllByOrderByMakeAscModelAsc();
        return models.stream()
                .map(m -> new MotorcycleModelDto(
                        m.getId(),
                        m.getMake(),
                        m.getModel(),
                        m.getDisplacementCc(),
                        m.getYearStart(),
                        m.getYearEnd(),
                        m.getCategory(),
                        m.getImageUrl(),
                        m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                        m.getUpdatedAt() != null ? m.getUpdatedAt().toString() : null
                ))
                .toList();
    }

    @Override
    public MotoMatcherMatrixDto getFitmentMatrix(UUID modelId, String category, String search) {
        if (modelId == null) {
            return MotoMatcherMatrixDto.empty();
        }

        String cleanCategory = (category != null && !category.trim().isEmpty()) ? category.trim() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        try {
            String sql = "SELECT public.get_moto_matcher_matrix(?::uuid, ?, ?)::text";
            String json = jdbcTemplate.queryForObject(sql, String.class, modelId, cleanCategory, cleanSearch);
            if (json == null || json.isBlank()) {
                return MotoMatcherMatrixDto.empty();
            }
            return objectMapper.readValue(json, MotoMatcherMatrixDto.class);
        } catch (Exception e) {
            log.warn("[MotoMatcherService] Error invoking public.get_moto_matcher_matrix for model {}: {}", modelId, e.getMessage());
            return MotoMatcherMatrixDto.empty();
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = CacheConfig.CACHE_MOTORCYCLE_MODELS, allEntries = true)
    public AddFitmentRuleResponse addFitmentRule(AddFitmentRuleRequest request) {
        if (request == null || request.productId() == null || request.modelId() == null) {
            return AddFitmentRuleResponse.error("Product ID and Model ID are required");
        }

        try {
            String fitmentType = request.fitmentType() != null && !request.fitmentType().isBlank()
                    ? request.fitmentType().toLowerCase()
                    : "aftermarket";

            ProductFitment fitment = productFitmentRepository
                    .findByProductIdAndModelId(request.productId(), request.modelId())
                    .orElseGet(() -> {
                        ProductFitment pf = new ProductFitment();
                        pf.setProductId(request.productId());
                        pf.setModelId(request.modelId());
                        pf.setCreatedAt(OffsetDateTime.now());
                        return pf;
                    });

            fitment.setFitmentType(fitmentType);
            fitment.setYearRange(request.yearRange());
            fitment.setNotes(request.notes());

            ProductFitment saved = productFitmentRepository.save(fitment);
            log.info("[MotoMatcherService] Saved fitment rule {} linking product {} to model {}",
                    saved.getId(), saved.getProductId(), saved.getModelId());

            return AddFitmentRuleResponse.ok(saved.getId().toString());
        } catch (Exception e) {
            log.error("[MotoMatcherService] Failed to add fitment rule: {}", e.getMessage(), e);
            return AddFitmentRuleResponse.error(e.getMessage());
        }
    }
}
