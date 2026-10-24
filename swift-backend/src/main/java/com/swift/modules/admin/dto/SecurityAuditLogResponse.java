package com.swift.modules.admin.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record SecurityAuditLogResponse(
    UUID id,
    OffsetDateTime timestamp,
    UUID userId,
    String userEmail,
    String action,
    String severity,
    String terminalIp,
    Map<String, Object> metadata,
    OffsetDateTime createdAt
) {}
