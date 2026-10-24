package com.swift.modules.admin.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.admin.dto.LogSecurityEventRequest;
import com.swift.modules.admin.dto.SecurityAuditLogResponse;
import com.swift.modules.admin.service.SecurityAuditService;
import com.swift.modules.auth.model.SecurityAuditLog;
import com.swift.modules.auth.repository.SecurityAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SecurityAuditServiceImpl implements SecurityAuditService {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditServiceImpl.class);

    private final SecurityAuditLogRepository auditLogRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public SecurityAuditServiceImpl(
            SecurityAuditLogRepository auditLogRepository,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.auditLogRepository = auditLogRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public SecurityAuditLogResponse logSecurityEvent(LogSecurityEventRequest request, UUID callerUserId, String callerEmail) {
        String severity = normalizeSeverity(request.severity());
        String effectiveEmail;
        if (request.userEmail() != null && !request.userEmail().isBlank()) {
            effectiveEmail = request.userEmail().trim().toLowerCase();
        } else if (callerEmail != null) {
            effectiveEmail = callerEmail;
        } else {
            effectiveEmail = "admin@swift.ph";
        }

        UUID generatedId = null;

        // Try calling the PostgreSQL stored procedure public.log_security_event
        try {
            String jsonMetadata = objectMapper.writeValueAsString(
                    request.metadata() != null ? request.metadata() : Map.of()
            );

            generatedId = jdbcTemplate.queryForObject(
                    "SELECT public.log_security_event(?, ?, ?, ?::jsonb)",
                    UUID.class,
                    request.action(),
                    severity,
                    request.terminalIp(),
                    jsonMetadata
            );
        } catch (Exception ex) {
            log.debug("Stored procedure invocation failed or not in Postgres runtime, falling back to repository: {}", ex.getMessage());
        }

        if (generatedId != null) {
            return auditLogRepository.findById(generatedId)
                    .map(this::mapToResponse)
                    .orElseGet(() -> createDirectFallback(request, callerUserId, effectiveEmail, severity));
        }

        return createDirectFallback(request, callerUserId, effectiveEmail, severity);
    }

    private SecurityAuditLogResponse createDirectFallback(
            LogSecurityEventRequest request,
            UUID callerUserId,
            String effectiveEmail,
            String severity
    ) {
        SecurityAuditLog entity = new SecurityAuditLog(
                callerUserId,
                effectiveEmail,
                request.action(),
                severity,
                request.terminalIp() != null ? request.terminalIp() : "192.168.1.100 (Admin PC)",
                request.metadata() != null ? request.metadata() : Map.of()
        );
        SecurityAuditLog saved = auditLogRepository.save(entity);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SecurityAuditLogResponse> getSecurityAuditLogs(
            String severity,
            String search,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            int page,
            int size
    ) {
        String filterSeverity = (severity == null || severity.isBlank() || "all".equalsIgnoreCase(severity)) ? null : severity.trim();
        String filterSearch = (search == null || search.isBlank()) ? null : search.trim();

        return auditLogRepository.findWithFilters(
                filterSeverity,
                filterSearch,
                PageRequest.of(Math.max(0, page), Math.max(1, size))
        ).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public String exportSecurityAuditLogs(
            String format,
            String severity,
            String search,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {
        String filterSeverity = (severity == null || severity.isBlank() || "all".equalsIgnoreCase(severity)) ? null : severity.trim();
        String filterSearch = (search == null || search.isBlank()) ? null : search.trim();

        List<SecurityAuditLog> logs = auditLogRepository.findWithFiltersList(
                filterSeverity,
                filterSearch
        );
        if (startDate != null) {
            logs = logs.stream().filter(l -> !l.getCreatedAt().isBefore(startDate)).toList();
        }
        if (endDate != null) {
            logs = logs.stream().filter(l -> !l.getCreatedAt().isAfter(endDate)).toList();
        }

        if ("json".equalsIgnoreCase(format)) {
            try {
                List<SecurityAuditLogResponse> responses = logs.stream().map(this::mapToResponse).toList();
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(responses);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize audit logs to JSON", e);
            }
        }

        StringBuilder csv = new StringBuilder();
        csv.append("ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata\n");
        for (SecurityAuditLog logEntry : logs) {
            csv.append(escapeCsv(logEntry.getId()))
               .append(",")
               .append(escapeCsv(logEntry.getTimestamp()))
               .append(",")
               .append(escapeCsv(logEntry.getUserEmail()))
               .append(",")
               .append(escapeCsv(logEntry.getAction()))
               .append(",")
               .append(escapeCsv(logEntry.getSeverity()))
               .append(",")
               .append(escapeCsv(logEntry.getTerminalIp()))
               .append(",")
               .append(escapeCsv(logEntry.getMetadata()))
               .append("\n");
        }
        return csv.toString();
    }

    private String escapeCsv(Object value) {
        if (value == null) return "";
        String str;
        if (value instanceof Map) {
            try {
                str = objectMapper.writeValueAsString(value);
            } catch (Exception ignored) {
                str = value.toString();
            }
        } else {
            str = value.toString();
        }
        if (str.contains(",") || str.contains("\"") || str.contains("\n") || str.contains("\r")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    private String normalizeSeverity(String raw) {
        if (raw == null || raw.isBlank()) return "info";
        String lower = raw.trim().toLowerCase();
        if ("warning".equals(lower) || "security_alert".equals(lower)) {
            return lower;
        }
        return "info";
    }

    public SecurityAuditLogResponse mapToResponse(SecurityAuditLog entity) {
        return new SecurityAuditLogResponse(
                entity.getId(),
                entity.getTimestamp(),
                entity.getUserId(),
                entity.getUserEmail(),
                entity.getAction(),
                entity.getSeverity(),
                entity.getTerminalIp(),
                entity.getMetadata() != null ? entity.getMetadata() : Map.of(),
                entity.getCreatedAt()
        );
    }
}
