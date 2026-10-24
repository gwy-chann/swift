package com.swift.modules.admin.controller;

import com.swift.modules.admin.dto.LogSecurityEventRequest;
import com.swift.modules.admin.dto.SecurityAuditLogResponse;
import com.swift.modules.admin.service.SecurityAuditService;
import com.swift.modules.auth.security.SwiftUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/audit/security")
@PreAuthorize("hasRole('ADMIN')")
public class SecurityAuditController {

    private final SecurityAuditService securityAuditService;

    public SecurityAuditController(SecurityAuditService securityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    @GetMapping
    public ResponseEntity<Page<SecurityAuditLogResponse>> getSecurityAuditLogs(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<SecurityAuditLogResponse> logs = securityAuditService.getSecurityAuditLogs(
                severity,
                search,
                startDate,
                endDate,
                page,
                size
        );
        return ResponseEntity.ok(logs);
    }

    @PostMapping
    public ResponseEntity<SecurityAuditLogResponse> logSecurityEvent(
            @Valid @RequestBody LogSecurityEventRequest request,
            Authentication authentication
    ) {
        UUID callerUserId = extractUserId(authentication);
        String callerEmail = extractUserEmail(authentication);

        SecurityAuditLogResponse response = securityAuditService.logSecurityEvent(
                request,
                callerUserId,
                callerEmail
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportSecurityAuditLogs(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate
    ) {
        String data = securityAuditService.exportSecurityAuditLogs(
                format,
                severity,
                search,
                startDate,
                endDate
        );

        if ("json".equalsIgnoreCase(format)) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"security-audit-logs.json\"")
                    .body(data);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"security-audit-logs.csv\"")
                .body(data);
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof SwiftUserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }

    private String extractUserEmail(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof SwiftUserPrincipal principal) {
            return principal.getEmail();
        }
        return authentication != null ? authentication.getName() : "admin@swift.ph";
    }
}
