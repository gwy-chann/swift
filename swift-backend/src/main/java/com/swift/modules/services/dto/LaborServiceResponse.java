package com.swift.modules.services.dto;

import com.swift.modules.services.model.LaborServiceEntity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LaborServiceResponse(
    UUID id,
    String code,
    String name,
    String bay,
    BigDecimal rate,
    String duration,
    String description,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static LaborServiceResponse fromEntity(LaborServiceEntity entity) {
        return new LaborServiceResponse(
            entity.getId(),
            entity.getCode(),
            entity.getName(),
            entity.getBay(),
            entity.getRate(),
            entity.getDuration(),
            entity.getDescription(),
            Boolean.TRUE.equals(entity.getActive()),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
