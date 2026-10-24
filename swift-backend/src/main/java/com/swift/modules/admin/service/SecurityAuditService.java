package com.swift.modules.admin.service;

import com.swift.modules.admin.dto.LogSecurityEventRequest;
import com.swift.modules.admin.dto.SecurityAuditLogResponse;
import org.springframework.data.domain.Page;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface SecurityAuditService {

    SecurityAuditLogResponse logSecurityEvent(LogSecurityEventRequest request, UUID callerUserId, String callerEmail);

    Page<SecurityAuditLogResponse> getSecurityAuditLogs(
            String severity,
            String search,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            int page,
            int size
    );

    String exportSecurityAuditLogs(
            String format,
            String severity,
            String search,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    );
}
