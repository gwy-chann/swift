package com.swift.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record LogSecurityEventRequest(
    @NotBlank(message = "Action is required")
    String action,

    String severity,

    String terminalIp,

    Map<String, Object> metadata,

    String userEmail
) {
    public LogSecurityEventRequest {
        if (severity == null || severity.isBlank()) {
            severity = "info";
        }
        if (metadata == null) {
            metadata = Map.of();
        }
    }
}
