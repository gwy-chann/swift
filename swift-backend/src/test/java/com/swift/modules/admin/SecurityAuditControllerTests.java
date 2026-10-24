package com.swift.modules.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.admin.dto.LogSecurityEventRequest;
import com.swift.modules.auth.model.SecurityAuditLog;
import com.swift.modules.auth.repository.SecurityAuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("java:S1313")
class SecurityAuditControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SecurityAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
    }

    @Test
    @DisplayName("Scenario 3: Forensic security event logging via stored procedure wrapper")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testLogSecurityEvent() throws Exception {
        LogSecurityEventRequest req = new LogSecurityEventRequest(
                "Manual inventory shrinkage clearance for SKU-9002",
                "warning",
                "192.168.1.100 (Admin PC)",
                Map.of("sku", "SKU-9002", "authorizedBy", "Store Owner"),
                "admin@swift.ph"
        );

        mockMvc.perform(post("/api/v1/admin/audit/security")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.action", is("Manual inventory shrinkage clearance for SKU-9002")))
                .andExpect(jsonPath("$.severity", is("warning")))
                .andExpect(jsonPath("$.userEmail", is("admin@swift.ph")));

        List<SecurityAuditLog> savedLogs = auditLogRepository.findAll();
        assertEquals(1, savedLogs.size());
        assertEquals("warning", savedLogs.get(0).getSeverity());
    }

    @Test
    @DisplayName("Scenario 5: Security audit log retrieval with severity filtering and search")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testGetSecurityAuditLogsWithFilters() throws Exception {
        SecurityAuditLog log1 = new SecurityAuditLog(
                UUID.randomUUID(), "carlos@swift.ph", "Modified Global Retail Markup", "warning", "192.168.1.100", Map.of()
        );
        SecurityAuditLog log2 = new SecurityAuditLog(
                UUID.randomUUID(), "mike@swift.ph", "Applied 20% Senior Discount on TX-1041", "info", "192.168.1.102", Map.of()
        );
        SecurityAuditLog log3 = new SecurityAuditLog(
                UUID.randomUUID(), "security@swift.ph", "Failed Master Admin PIN Elevation", "security_alert", "192.168.1.109", Map.of()
        );
        auditLogRepository.saveAll(List.of(log1, log2, log3));

        // 1. Filter by severity=security_alert
        mockMvc.perform(get("/api/v1/admin/audit/security?severity=security_alert"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].severity", is("security_alert")))
                .andExpect(jsonPath("$.content[0].action", containsString("Failed Master Admin PIN")));

        // 2. Filter by search=TX-1041
        mockMvc.perform(get("/api/v1/admin/audit/security?search=TX-1041"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].action", containsString("TX-1041")));
    }

    @Test
    @DisplayName("Scenario 6: Security audit log export to RFC 4180 CSV")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testExportSecurityAuditLogsCsv() throws Exception {
        SecurityAuditLog logEntry = new SecurityAuditLog(
                UUID.randomUUID(),
                "admin@swift.ph",
                "Created employee account for cashier.jane@swift.ph",
                "info",
                "192.168.1.100 (Admin PC)",
                Map.of("role", "cashier")
        );
        auditLogRepository.save(logEntry);

        mockMvc.perform(get("/api/v1/admin/audit/security/export?format=csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(containsString("ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata")))
                .andExpect(content().string(containsString("Created employee account for cashier.jane@swift.ph")))
                .andExpect(content().string(containsString("admin@swift.ph")));
    }

    @Test
    @DisplayName("Security audit log export to formatted JSON")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testExportSecurityAuditLogsJson() throws Exception {
        SecurityAuditLog logEntry = new SecurityAuditLog(
                UUID.randomUUID(),
                "admin@swift.ph",
                "Security alert event",
                "security_alert",
                "192.168.1.100",
                Map.of("test", true)
        );
        auditLogRepository.save(logEntry);

        mockMvc.perform(get("/api/v1/admin/audit/security/export?format=json"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].severity", is("security_alert")));
    }
}
