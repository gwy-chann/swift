package com.swift.modules.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.auth.dto.ElevationRequest;
import com.swift.modules.auth.dto.KioskAuthRequest;
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
class StaffAuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/v1/staff/kiosk-auth verifies 4-digit PIN and returns staff profile with permissions")
    void kioskAuthSuccess() throws Exception {
        KioskAuthRequest request = new KioskAuthRequest("00000000-0000-0000-0000-000000000002", "1234");

        mockMvc.perform(post("/api/v1/staff/kiosk-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.profile.id").value("00000000-0000-0000-0000-000000000002"))
                .andExpect(jsonPath("$.profile.full_name").value("Mike Morales"))
                .andExpect(jsonPath("$.profile.role").value("cashier"))
                .andExpect(jsonPath("$.profile.permissions.can_discount").value(true))
                .andExpect(jsonPath("$.profile.permissions.can_override_discount").value(false))
                .andExpect(jsonPath("$.profile.permissions.can_adjust_stock").value(false))
                .andExpect(cookie().value("swift-staff-session", "00000000-0000-0000-0000-000000000002"))
                .andExpect(cookie().value("swift-session-role", "cashier"))
                .andExpect(cookie().value("swift-user-name", "Mike Morales"));
    }

    @Test
    @DisplayName("POST /api/v1/staff/kiosk-auth hydrates stock adjustment permission for inventory clerk")
    void kioskAuthInventoryClerkPermissions() throws Exception {
        KioskAuthRequest request = new KioskAuthRequest("00000000-0000-0000-0000-000000000004", "3333");

        mockMvc.perform(post("/api/v1/staff/kiosk-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.profile.permissions.can_adjust_stock").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/staff/kiosk-auth rejects incorrect PIN with INVALID_PIN")
    void kioskAuthIncorrectPinFails() throws Exception {
        KioskAuthRequest request = new KioskAuthRequest("00000000-0000-0000-0000-000000000002", "9999");

        mockMvc.perform(post("/api/v1/staff/kiosk-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_PIN"))
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/v1/staff/kiosk-auth rejects malformed non-4-digit PIN with validation error")
    void kioskAuthMalformedPinFails() throws Exception {
        String invalidJson = "{\"profileId\":\"00000000-0000-0000-0000-000000000002\",\"pin\":\"12\"}";

        mockMvc.perform(post("/api/v1/staff/kiosk-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/staff/admin-elevation authorizes admin credentials and sets 1-hour cookie")
    void adminElevationSuccess() throws Exception {
        ElevationRequest request = new ElevationRequest("admin123");

        mockMvc.perform(post("/api/v1/staff/admin-elevation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.elevated").value(true))
                .andExpect(jsonPath("$.expiresAt").isNumber())
                .andExpect(cookie().value("swift_admin_elevated", "true"))
                .andExpect(cookie().maxAge("swift_admin_elevated", 3600));
    }

    @Test
    @DisplayName("POST /api/v1/staff/admin-elevation authorizes master pin 8888")
    void adminElevationWithPinSuccess() throws Exception {
        ElevationRequest request = new ElevationRequest("8888");

        mockMvc.perform(post("/api/v1/staff/admin-elevation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.elevated").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/staff/admin-elevation rejects invalid credentials with HTTP 401")
    void adminElevationInvalidPasswordFails() throws Exception {
        ElevationRequest request = new ElevationRequest("wrongpassword");

        mockMvc.perform(post("/api/v1/staff/admin-elevation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.elevated").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_PIN"));
    }

    @Test
    @DisplayName("POST /api/v1/staff/admin-elevation rejects empty password with HTTP 400")
    void adminElevationEmptyPasswordFails() throws Exception {
        ElevationRequest request = new ElevationRequest("");

        mockMvc.perform(post("/api/v1/staff/admin-elevation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("EMPTY_PASSWORD"));
    }
}
