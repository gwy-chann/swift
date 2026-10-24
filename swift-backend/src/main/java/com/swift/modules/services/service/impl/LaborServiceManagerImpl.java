package com.swift.modules.services.service.impl;

import com.swift.common.exception.ResourceNotFoundException;
import com.swift.modules.services.dto.*;
import com.swift.modules.services.exception.DuplicateServiceCodeException;
import com.swift.modules.services.model.LaborServiceEntity;
import com.swift.modules.services.model.ServiceRateAuditLogEntity;
import com.swift.modules.services.repository.LaborServiceRepository;
import com.swift.modules.services.repository.ServiceRateAuditLogRepository;
import com.swift.modules.services.service.LaborServiceManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional
public class LaborServiceManagerImpl implements LaborServiceManager {

    private static final Pattern UUID_PATTERN = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );

    private final LaborServiceRepository laborServiceRepository;
    private final ServiceRateAuditLogRepository auditLogRepository;

    public LaborServiceManagerImpl(LaborServiceRepository laborServiceRepository,
                                   ServiceRateAuditLogRepository auditLogRepository) {
        this.laborServiceRepository = laborServiceRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LaborServiceResponse> getLaborServices(Boolean active, String bay, String keyword) {
        List<LaborServiceEntity> entities;

        if (active != null) {
            entities = laborServiceRepository.findByActiveOrderByCodeAsc(active);
        } else if (bay != null && !bay.isBlank()) {
            entities = laborServiceRepository.findByBayIgnoreCaseOrderByCodeAsc(bay.trim());
        } else if (keyword != null && !keyword.isBlank()) {
            entities = laborServiceRepository.findByNameContainingIgnoreCaseOrderByCodeAsc(keyword.trim());
        } else {
            entities = laborServiceRepository.findAllByOrderByCodeAsc();
        }

        return entities.stream()
            .map(LaborServiceResponse::fromEntity)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LaborServiceResponse getLaborServiceByIdOrCode(String identifier) {
        LaborServiceEntity entity = resolveEntity(identifier);
        return LaborServiceResponse.fromEntity(entity);
    }

    @Override
    public LaborServiceResponse createLaborService(CreateLaborServiceRequest request) {
        String normalizedCode = request.code().trim().toUpperCase();

        if (laborServiceRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new DuplicateServiceCodeException(normalizedCode);
        }

        LaborServiceEntity entity = new LaborServiceEntity();
        entity.setCode(normalizedCode);
        entity.setName(request.name().trim());
        entity.setBay(request.bay().trim());
        entity.setRate(request.rate());
        entity.setDuration(request.duration().trim());
        entity.setDescription(request.description() != null ? request.description().trim() : null);
        entity.setActive(request.active() != null ? request.active() : true);

        LaborServiceEntity saved = laborServiceRepository.save(entity);
        return LaborServiceResponse.fromEntity(saved);
    }

    @Override
    public LaborServiceResponse updateLaborService(String identifier, UpdateLaborServiceRequest request) {
        LaborServiceEntity entity = resolveEntity(identifier);

        BigDecimal oldRate = entity.getRate();
        BigDecimal newRate = request.rate();

        if (newRate != null && newRate.compareTo(oldRate) != 0) {
            ServiceRateAuditLogEntity audit = new ServiceRateAuditLogEntity();
            audit.setServiceId(entity.getId());
            audit.setServiceCode(entity.getCode());
            audit.setOldRate(oldRate);
            audit.setNewRate(newRate);
            audit.setReason(request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim()
                : "Admin flat rate adjustment");
            audit.setUserName(request.userName() != null && !request.userName().isBlank()
                ? request.userName().trim()
                : "Service Desk Manager");

            auditLogRepository.save(audit);
            entity.setRate(newRate);
        }

        if (request.name() != null && !request.name().isBlank()) {
            entity.setName(request.name().trim());
        }
        if (request.bay() != null && !request.bay().isBlank()) {
            entity.setBay(request.bay().trim());
        }
        if (request.duration() != null && !request.duration().isBlank()) {
            entity.setDuration(request.duration().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description().trim());
        }
        if (request.active() != null) {
            entity.setActive(request.active());
        }

        LaborServiceEntity saved = laborServiceRepository.save(entity);
        return LaborServiceResponse.fromEntity(saved);
    }

    @Override
    public LaborServiceResponse updateLaborServiceStatus(String identifier, boolean active) {
        LaborServiceEntity entity = resolveEntity(identifier);
        entity.setActive(active);
        LaborServiceEntity saved = laborServiceRepository.save(entity);
        return LaborServiceResponse.fromEntity(saved);
    }

    @Override
    public void deleteLaborService(String identifier) {
        LaborServiceEntity entity = resolveEntity(identifier);
        laborServiceRepository.delete(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRateAuditLogResponse> getRateAuditLogs(String serviceIdentifier) {
        List<ServiceRateAuditLogEntity> logs;

        if (serviceIdentifier != null && !serviceIdentifier.isBlank()) {
            String trimmed = serviceIdentifier.trim();
            if (UUID_PATTERN.matcher(trimmed).matches()) {
                logs = auditLogRepository.findByServiceIdOrderByCreatedAtDesc(UUID.fromString(trimmed));
            } else {
                logs = auditLogRepository.findByServiceCodeIgnoreCaseOrderByCreatedAtDesc(trimmed);
            }
        } else {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        }

        return logs.stream()
            .map(ServiceRateAuditLogResponse::fromEntity)
            .toList();
    }

    private LaborServiceEntity resolveEntity(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Labor service identifier must not be empty.");
        }

        String trimmed = identifier.trim();
        if (UUID_PATTERN.matcher(trimmed).matches()) {
            return laborServiceRepository.findById(UUID.fromString(trimmed))
                .or(() -> laborServiceRepository.findByCodeIgnoreCase(trimmed))
                .orElseThrow(() -> new ResourceNotFoundException("Labor service \"" + trimmed + "\" was not found."));
        }

        return laborServiceRepository.findByCodeIgnoreCase(trimmed)
            .orElseThrow(() -> new ResourceNotFoundException("Labor service \"" + trimmed + "\" was not found."));
    }
}
