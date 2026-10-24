package com.swift.modules.pricing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.pricing.dto.UpdatePricingRulesRequest;
import com.swift.modules.pricing.model.PricingRules;
import com.swift.modules.pricing.model.PricingRulesAuditLog;
import com.swift.modules.pricing.repository.PricingRulesAuditLogRepository;
import com.swift.modules.pricing.repository.PricingRulesRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PricingRulesControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PricingRulesRepository pricingRulesRepository;

    @Autowired
    private PricingRulesAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        pricingRulesRepository.deleteAll();

        PricingRules rules = new PricingRules(
                1L,
                new BigDecimal("35.00"),
                new BigDecimal("18.00"),
                new BigDecimal("40.00"),
                new BigDecimal("450.00"),
                null,
                null
        );
        pricingRulesRepository.save(rules);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 4a: Retrieve active global pricing rules")
    void shouldRetrieveActivePricingRules() throws Exception {
        mockMvc.perform(get("/api/v1/pricing/rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retailMarkup", is(35.00)))
                .andExpect(jsonPath("$.wholesaleMarkup", is(18.00)))
                .andExpect(jsonPath("$.aftermarketMarkup", is(40.00)))
                .andExpect(jsonPath("$.hourlyLaborRate", is(450.00)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 4b: Update global pricing markup rules and record immutable audit trail")
    void shouldUpdatePricingRulesAndCreateAuditRecord() throws Exception {
        UpdatePricingRulesRequest request = new UpdatePricingRulesRequest(
                new BigDecimal("38.00"),
                new BigDecimal("20.00"),
                new BigDecimal("42.00"),
                new BigDecimal("500.00"),
                "Shop Admin",
                "Q4 2026 Inflation Adjustment"
        );

        mockMvc.perform(put("/api/v1/pricing/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retailMarkup", is(38.00)))
                .andExpect(jsonPath("$.wholesaleMarkup", is(20.00)))
                .andExpect(jsonPath("$.aftermarketMarkup", is(42.00)))
                .andExpect(jsonPath("$.hourlyLaborRate", is(500.00)));

        // Verify updated row in DB
        PricingRules updated = pricingRulesRepository.findActiveRules().orElseThrow();
        assertEquals(new BigDecimal("38.00"), updated.getRetailMarkup());
        assertEquals(new BigDecimal("500.00"), updated.getHourlyLaborRate());

        // Verify audit log row in DB
        List<PricingRulesAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        assertEquals(1, logs.size());
        PricingRulesAuditLog log = logs.get(0);
        assertEquals(new BigDecimal("35.00"), log.getOldRetailMarkup());
        assertEquals(new BigDecimal("38.00"), log.getNewRetailMarkup());
        assertEquals(new BigDecimal("450.00"), log.getOldHourlyLaborRate());
        assertEquals(new BigDecimal("500.00"), log.getNewHourlyLaborRate());
        assertEquals("Shop Admin", log.getUserName());
        assertEquals("Q4 2026 Inflation Adjustment", log.getReason());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Validation: Reject invalid markup percentages > 200%")
    void shouldRejectExcessiveMarkupPercentage() throws Exception {
        UpdatePricingRulesRequest request = new UpdatePricingRulesRequest(
                new BigDecimal("250.00"), // Invalid: > 200%
                new BigDecimal("18.00"),
                new BigDecimal("40.00"),
                new BigDecimal("450.00"),
                "Admin",
                "Invalid"
        );

        mockMvc.perform(put("/api/v1/pricing/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
