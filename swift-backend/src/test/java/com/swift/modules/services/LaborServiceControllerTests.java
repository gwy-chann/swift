package com.swift.modules.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.services.dto.CreateLaborServiceRequest;
import com.swift.modules.services.dto.UpdateLaborServiceRequest;
import com.swift.modules.services.dto.UpdateLaborServiceStatusRequest;
import com.swift.modules.services.model.LaborServiceEntity;
import com.swift.modules.services.model.ServiceRateAuditLogEntity;
import com.swift.modules.services.repository.LaborServiceRepository;
import com.swift.modules.services.repository.ServiceRateAuditLogRepository;
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

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LaborServiceControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LaborServiceRepository laborServiceRepository;

    @Autowired
    private ServiceRateAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        laborServiceRepository.deleteAll();
    }

    @Test
    @DisplayName("Scenario 1: Create flat-rate labor service and update rate with audit log capture")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testCreateAndUpdateLaborServiceWithAuditLog() throws Exception {
        // 1. Create labor service
        CreateLaborServiceRequest createReq = new CreateLaborServiceRequest(
            "CVT-01",
            "CVT Cleaning & Tuning",
            "Bay 1 - Quick Service",
            new BigDecimal("350.00"),
            "45 mins",
            "Full pulley inspection and belt cleaning",
            true
        );

        mockMvc.perform(post("/api/v1/services/labor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("CVT-01"))
            .andExpect(jsonPath("$.name").value("CVT Cleaning & Tuning"))
            .andExpect(jsonPath("$.rate").value(350.00))
            .andExpect(jsonPath("$.active").value(true));

        LaborServiceEntity saved = laborServiceRepository.findByCodeIgnoreCase("CVT-01").orElseThrow();
        assertEquals(new BigDecimal("350.00"), saved.getRate());

        // 2. Update rate to 400.00 via PUT
        UpdateLaborServiceRequest updateReq = new UpdateLaborServiceRequest(
            null,
            null,
            new BigDecimal("400.00"),
            null,
            null,
            null,
            "Annual parts inflation adjustment",
            "Service Desk Manager"
        );

        mockMvc.perform(put("/api/v1/services/labor/" + saved.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rate").value(400.00));

        // 3. Verify audit log record
        List<ServiceRateAuditLogEntity> auditLogs = auditLogRepository.findByServiceIdOrderByCreatedAtDesc(saved.getId());
        assertEquals(1, auditLogs.size());
        ServiceRateAuditLogEntity audit = auditLogs.get(0);
        assertEquals(new BigDecimal("350.00"), audit.getOldRate());
        assertEquals(new BigDecimal("400.00"), audit.getNewRate());
        assertEquals("CVT-01", audit.getServiceCode());
        assertEquals("Annual parts inflation adjustment", audit.getReason());
        assertEquals("Service Desk Manager", audit.getUserName());
    }

    @Test
    @DisplayName("Scenario 2: Deactivate workshop labor service and verify exclusion from POS catalog")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testDeactivateServiceExcludesFromPosCatalog() throws Exception {
        // Create an active service
        LaborServiceEntity entity = new LaborServiceEntity();
        entity.setCode("TIRE-01");
        entity.setName("Tire Replacement & Balancing");
        entity.setBay("Bay 2 - Tires & Suspension");
        entity.setRate(new BigDecimal("250.00"));
        entity.setDuration("30 mins");
        entity.setActive(true);
        laborServiceRepository.save(entity);

        // Deactivate via PATCH /status
        UpdateLaborServiceStatusRequest statusReq = new UpdateLaborServiceStatusRequest(false);
        mockMvc.perform(patch("/api/v1/services/labor/TIRE-01/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));

        // Query active catalog (POS Cashier catalog query)
        mockMvc.perform(get("/api/v1/services/labor").param("active", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));

        // Query all services (Admin management)
        mockMvc.perform(get("/api/v1/services/labor"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].code").value("TIRE-01"))
            .andExpect(jsonPath("$[0].active").value(false));
    }

    @Test
    @DisplayName("Scenario 3: Filter labor services by status, bay, and search keyword")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testFilterLaborServices() throws Exception {
        LaborServiceEntity s1 = new LaborServiceEntity(null, "OIL-01", "Engine Oil Change", "Bay 1",
            new BigDecimal("150.00"), "15 mins", "Standard oil change", true, null, null);
        LaborServiceEntity s2 = new LaborServiceEntity(null, "BRK-01", "Brake Pad Replacement", "Bay 2",
            new BigDecimal("200.00"), "25 mins", "Front & rear brake check", false, null, null);
        laborServiceRepository.saveAll(List.of(s1, s2));

        // Active only
        mockMvc.perform(get("/api/v1/services/labor").param("active", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].code").value("OIL-01"));

        // By bay
        mockMvc.perform(get("/api/v1/services/labor").param("bay", "Bay 2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].code").value("BRK-01"));

        // By keyword
        mockMvc.perform(get("/api/v1/services/labor").param("search", "Brake"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].code").value("BRK-01"));
    }

    @Test
    @DisplayName("Scenario 4: Query service rate audit logs by code and ID")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testQueryServiceRateAuditLogs() throws Exception {
        CreateLaborServiceRequest createReq = new CreateLaborServiceRequest(
            "FLUSH-01", "Radiator Coolant Flush", "Bay 1",
            new BigDecimal("300.00"), "20 mins", "Complete coolant change", true
        );
        mockMvc.perform(post("/api/v1/services/labor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated());

        // Rate update
        UpdateLaborServiceRequest updateReq = new UpdateLaborServiceRequest(
            null, null, new BigDecimal("350.00"), null, null, null,
            "Coolant chemical supplier cost increase", "Service Desk Manager"
        );
        mockMvc.perform(put("/api/v1/services/labor/FLUSH-01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk());

        // Query audit logs
        mockMvc.perform(get("/api/v1/services/labor/audit-logs").param("serviceCode", "FLUSH-01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].serviceCode").value("FLUSH-01"))
            .andExpect(jsonPath("$[0].oldRate").value(300.00))
            .andExpect(jsonPath("$[0].newRate").value(350.00))
            .andExpect(jsonPath("$[0].reason").value("Coolant chemical supplier cost increase"));
    }

    @Test
    @DisplayName("Scenario 5: Duplicate service code rejection returns 409 Conflict")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testDuplicateServiceCodeRejection() throws Exception {
        CreateLaborServiceRequest req1 = new CreateLaborServiceRequest(
            "WASH-01", "Complete Motorcycle Wash", "Bay 3",
            new BigDecimal("100.00"), "20 mins", "Foam wash", true
        );
        mockMvc.perform(post("/api/v1/services/labor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
            .andExpect(status().isCreated());

        CreateLaborServiceRequest req2 = new CreateLaborServiceRequest(
            "wash-01", "Duplicate Motorcycle Wash", "Bay 3",
            new BigDecimal("120.00"), "20 mins", "Another wash", true
        );
        mockMvc.perform(post("/api/v1/services/labor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DUPLICATE_CODE"));
    }

    @Test
    @DisplayName("Scenario 6: Zero or negative rate rejection returns 400 Bad Request")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testInvalidRateRejection() throws Exception {
        CreateLaborServiceRequest req = new CreateLaborServiceRequest(
            "BAD-01", "Free Labor Service", "Bay 1",
            new BigDecimal("0.00"), "10 mins", "Zero rate", true
        );
        mockMvc.perform(post("/api/v1/services/labor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.rate").exists());
    }

    @Test
    @DisplayName("Scenario 7: Dual identifier resolution by UUID and service code")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testDualIdentifierResolution() throws Exception {
        LaborServiceEntity entity = new LaborServiceEntity();
        entity.setCode("CHAIN-01");
        entity.setName("Drive Chain Cleaning & Lube");
        entity.setBay("Bay 1");
        entity.setRate(new BigDecimal("180.00"));
        entity.setDuration("15 mins");
        entity.setActive(true);
        LaborServiceEntity saved = laborServiceRepository.save(entity);

        // Fetch by UUID
        mockMvc.perform(get("/api/v1/services/labor/" + saved.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("CHAIN-01"));

        // Fetch by uppercase business code
        mockMvc.perform(get("/api/v1/services/labor/CHAIN-01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(saved.getId().toString()));
    }
}
