package com.swift.modules.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.auth.dto.LoginRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/v1/auth/login authenticates demo admin and sets session cookies")
    void loginDemoAdminSuccess() throws Exception {
        LoginRequest request = new LoginRequest("admin@swift.local", "password123", "admin", false);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.redirectTo").value("/admin"))
                .andExpect(jsonPath("$.session.id").value("00000000-0000-0000-0000-000000000001"))
                .andExpect(jsonPath("$.session.email").value("admin@swift.local"))
                .andExpect(jsonPath("$.session.name").value("Shop Administrator"))
                .andExpect(jsonPath("$.session.role").value("admin"))
                .andExpect(cookie().value("swift-session-role", "admin"))
                .andExpect(cookie().value("swift-user-name", "Shop Administrator"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login authenticates demo cashier and sets session cookies")
    void loginDemoCashierSuccess() throws Exception {
        LoginRequest request = new LoginRequest("cashier@swift.local", "password123", "staff", false);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.redirectTo").value("/staff/pos"))
                .andExpect(jsonPath("$.session.id").value("00000000-0000-0000-0000-000000000002"))
                .andExpect(jsonPath("$.session.role").value("staff"))
                .andExpect(cookie().value("swift-session-role", "staff"))
                .andExpect(cookie().value("swift-user-name", "Shop Floor Cashier"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login rejects unknown email with INVALID_CREDENTIALS")
    void loginUnknownEmailFails() throws Exception {
        LoginRequest request = new LoginRequest("unknown@example.com", "wrongpass", "staff", false);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login rejects empty email with validation error")
    void loginEmptyEmailFails() throws Exception {
        String invalidJson = "{\"email\":\"\",\"password\":\"123\",\"selectedRole\":\"staff\",\"rememberTerminal\":false}";

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout clears cookies and returns redirect")
    void logoutClearsCookies() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.redirectTo").value("/"))
                .andExpect(cookie().maxAge("swift-session-role", 0))
                .andExpect(cookie().maxAge("swift-user-name", 0));
    }
}
