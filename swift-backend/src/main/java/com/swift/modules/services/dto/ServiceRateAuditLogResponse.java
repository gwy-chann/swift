package com.swift.modules.services.dto;

import com.swift.modules.services.model.ServiceRateAuditLogEntity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ServiceRateAuditLogResponse(
    UUID id,
    UUID serviceId,
    String serviceCode,
    BigDecimal oldRate,
    BigDecimal newRate,
    String reason,
    String userName,
    OffsetDateTime createdAt
) {
    public static ServiceRateAuditLogResponse fromEntity(ServiceRateAuditLogEntity entity) {
        return new ServiceRateAuditLogResponse(
            entity.getId(),
            entity.getServiceId(),
            entity.getServiceCode(),
            entity.getOldRate(),
            entity.getNewRate(),
            entity.getReason(),
            entity.getUserName(),
            entity.getCreatedAt()
        );
    }
}
