package com.swift.modules.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.admin.dto.ProvisionStaffUserRequest;
import com.swift.modules.admin.dto.UpdateStaffUserRequest;
import com.swift.modules.admin.dto.UpdateUserPermissionsRequest;
import com.swift.modules.admin.dto.UpdateUserStatusRequest;
import com.swift.modules.auth.model.SecurityAuditLog;
import com.swift.modules.auth.model.StaffPermissions;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.SecurityAuditLogRepository;
import com.swift.modules.auth.repository.StaffProfileRepository;
import com.swift.modules.auth.security.SwiftUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAdminControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StaffProfileRepository profileRepository;

    @Autowired
    private SecurityAuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        profileRepository.deleteAll();
    }

    @Test
    @DisplayName("Scenario 1: Admin provisions staff user with granular permission flags")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testProvisionStaffUserWithCustomPermissions() throws Exception {
        StaffPermissions customPerms = new StaffPermissions();
        customPerms.setCanOverrideDiscount(true);
        customPerms.setCanAdjustStock(false);

        ProvisionStaffUserRequest req = new ProvisionStaffUserRequest(
                "cashier.test@swift.ph",
                "Jane Cashier",
                "cashier",
                "SecretSecure#123",
                customPerms
        );

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("cashier.test@swift.ph")))
                .andExpect(jsonPath("$.fullName", is("Jane Cashier")))
                .andExpect(jsonPath("$.role", is("cashier")))
                .andExpect(jsonPath("$.roleDisplay", is("Cashier")))
                .andExpect(jsonPath("$.status", is("Active")))
                .andExpect(jsonPath("$.permissions.can_override_discount", is(true)))
                .andExpect(jsonPath("$.permissions.can_adjust_stock", is(false)));

        // Verify database persistence
        StaffProfile savedProfile = profileRepository.findByEmailIgnoreCase("cashier.test@swift.ph").orElseThrow();
        assertEquals("Jane Cashier", savedProfile.getFullName());
        assertTrue(savedProfile.getPermissions().isCanOverrideDiscount());
        assertFalse(savedProfile.getPermissions().isCanAdjustStock());

        // Verify security audit event USER_PROVISIONED
        List<SecurityAuditLog> logs = auditLogRepository.findAll();
        assertEquals(1, logs.size());
        assertTrue(logs.get(0).getAction().contains("cashier.test@swift.ph"));
        assertEquals("info", logs.get(0).getSeverity());
    }

    @Test
    @DisplayName("Scenario 2: Prevent administrative self-lockout on status deactivation")
    void testPreventAdministrativeSelfLockout() throws Exception {
        UUID adminId = UUID.randomUUID();
        StaffProfile adminProfile = new StaffProfile(
                adminId,
                "admin-01@swift.ph",
                "Admin Zero One",
                "admin",
                "Active",
                "hashed",
                StaffPermissions.adminDefaults()
        );
        profileRepository.save(adminProfile);

        // Authenticate as this exact admin
        SwiftUserPrincipal principal = new SwiftUserPrincipal(
                adminId,
                "admin-01@swift.ph",
                "Admin Zero One",
                "admin",
                SwiftUserPrincipal.AuthSource.DEMO_BYPASS,
                true
        );
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        UpdateUserStatusRequest deactReq = new UpdateUserStatusRequest("Inactive");

        mockMvc.perform(patch("/api/v1/admin/users/" + adminId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deactReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("SELF_LOCKOUT_PREVENTED")))
                .andExpect(jsonPath("$.message", containsString("Self-deactivation is prohibited")));
    }

    @Test
    @DisplayName("Scenario 2b: Prevent administrative self-demotion on user details PUT")
    void testPreventAdministrativeSelfDemotion() throws Exception {
        UUID adminId = UUID.randomUUID();
        StaffProfile adminProfile = new StaffProfile(
                adminId,
                "admin-02@swift.ph",
                "Admin Zero Two",
                "admin",
                "Active",
                "hashed",
                StaffPermissions.adminDefaults()
        );
        profileRepository.save(adminProfile);

        SwiftUserPrincipal principal = new SwiftUserPrincipal(
                adminId,
                "admin-02@swift.ph",
                "Admin Zero Two",
                "admin",
                SwiftUserPrincipal.AuthSource.DEMO_BYPASS,
                true
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        UpdateStaffUserRequest demoteReq = new UpdateStaffUserRequest(
                "Admin Zero Two",
                "staff", // attempted demotion
                StaffPermissions.cashierDefaults()
        );

        mockMvc.perform(put("/api/v1/admin/users/" + adminId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(demoteReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("SELF_LOCKOUT_PREVENTED")))
                .andExpect(jsonPath("$.message", containsString("Admin self-demotion is prohibited")));
    }

    @Test
    @DisplayName("Scenario 4: Admin updates staff user details & permission flags with audit trail")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testAdminUpdatesStaffUser() throws Exception {
        UUID staffId = UUID.randomUUID();
        StaffProfile staff = new StaffProfile(
                staffId,
                "user-02@swift.ph",
                "Original Name",
                "staff",
                "Active",
                "hashed",
                new StaffPermissions()
        );
        profileRepository.save(staff);

        StaffPermissions updatedPerms = new StaffPermissions();
        updatedPerms.setCanAdjustStock(true);

        UpdateStaffUserRequest updateReq = new UpdateStaffUserRequest(
                "Updated Name",
                "inventory_clerk",
                updatedPerms
        );

        mockMvc.perform(put("/api/v1/admin/users/" + staffId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("Updated Name")))
                .andExpect(jsonPath("$.role", is("inventory_clerk")))
                .andExpect(jsonPath("$.roleDisplay", is("Inventory Clerk")))
                .andExpect(jsonPath("$.permissions.can_adjust_stock", is(true)));

        // Verify audit log captured
        List<SecurityAuditLog> logs = auditLogRepository.findAll();
        assertEquals(1, logs.size());
        assertTrue(logs.get(0).getAction().contains("user-02@swift.ph"));
    }

    @Test
    @DisplayName("Provisioning duplicate email returns HTTP 409 Conflict")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testDuplicateEmailReturnsConflict() throws Exception {
        StaffProfile existing = new StaffProfile(
                UUID.randomUUID(),
                "existing@swift.ph",
                "Existing User",
                "staff",
                "Active",
                "hashed",
                new StaffPermissions()
        );
        profileRepository.save(existing);

        ProvisionStaffUserRequest dupReq = new ProvisionStaffUserRequest(
                "existing@swift.ph",
                "Duplicate Person",
                "staff",
                "Password#123",
                null
        );

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("DUPLICATE_EMAIL")))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("List staff users returns chronological order")
    @WithMockUser(username = "admin@swift.ph", roles = {"ADMIN"})
    void testListStaffUsers() throws Exception {
        StaffProfile u1 = new StaffProfile(UUID.randomUUID(), "a@swift.ph", "User A", "cashier", "Active", "h", new StaffPermissions());
        u1.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusDays(2));
        StaffProfile u2 = new StaffProfile(UUID.randomUUID(), "b@swift.ph", "User B", "mechanic", "Active", "h", new StaffPermissions());
        u2.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));

        profileRepository.saveAll(List.of(u1, u2));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].email", is("a@swift.ph")))
                .andExpect(jsonPath("$[1].email", is("b@swift.ph")));
    }
}
