package com.swift.modules.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class TestControllerConfig {
        @RestController
        @RequestMapping("/api/v1/admin")
        static class TestAdminController {
            @GetMapping("/users")
            @PreAuthorize("hasRole('ADMIN')")
            public String getAdminUsers() {
                return "{\"success\":true,\"data\":\"admin-users\"}";
            }
        }

        @RestController
        @RequestMapping("/api/v1/catalog")
        static class TestCatalogController {
            @GetMapping("/products")
            public String getProducts() {
                return "{\"success\":true,\"data\":\"products\"}";
            }
        }
    }

    @Test
    @DisplayName("Actuator health endpoint is publicly accessible without authentication")
    void actuatorHealthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthenticated request to protected endpoint returns HTTP 401 with standard ErrorDetails")
    void unauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Full authentication is required to access this resource"));
    }

    @Test
    @DisplayName("Staff session cookie attempting to access admin route returns HTTP 403 Forbidden")
    void staffCookieAccessingAdminReturns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .cookie(new Cookie("swift-session-role", "staff"),
                                new Cookie("swift-staff-session", "00000000-0000-0000-0000-000000000002"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Access is denied. Insufficient administrative privileges."));
    }

    @Test
    @DisplayName("Admin session cookie accessing admin route returns HTTP 200 OK")
    void adminCookieAccessingAdminReturns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .cookie(new Cookie("swift-session-role", "admin"),
                                new Cookie("swift-user-name", "Administrator"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Staff session cookie accessing general authenticated route returns HTTP 200 OK")
    void staffCookieAccessingCatalogReturns200() throws Exception {
        mockMvc.perform(get("/api/v1/catalog/products")
                        .cookie(new Cookie("swift-session-role", "staff"),
                                new Cookie("swift-staff-session", "00000000-0000-0000-0000-000000000002"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
