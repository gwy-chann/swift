package com.swift;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthActuatorTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Scenario 3: Probe GET /actuator/health returns status UP")
    void actuatorHealthReturnsUp() throws Exception {
        mockMvc.perform(get("/actuator/health")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Verify Actuator metrics endpoint is exposed and accessible")
    void actuatorMetricsEndpointAccessible() throws Exception {
        mockMvc.perform(get("/actuator/metrics")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk());
    }
}
