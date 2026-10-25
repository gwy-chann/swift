package com.swift.modules.admin.controller;

import com.swift.modules.admin.dto.*;
import com.swift.modules.admin.service.UserAdminService;
import com.swift.modules.auth.security.SwiftUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public ResponseEntity<List<StaffUserResponse>> listStaffUsers() {
        return ResponseEntity.ok(userAdminService.listStaffUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StaffUserResponse> getStaffUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userAdminService.getStaffUser(id));
    }

    @PostMapping
    public ResponseEntity<StaffUserResponse> provisionStaffUser(
            @Valid @RequestBody ProvisionStaffUserRequest request,
            Authentication authentication
    ) {
        UUID callerUserId = extractUserId(authentication);
        String callerEmail = extractUserEmail(authentication);

        StaffUserResponse response = userAdminService.provisionStaffUser(request, callerUserId, callerEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StaffUserResponse> updateStaffUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStaffUserRequest request,
            Authentication authentication
    ) {
        UUID callerUserId = extractUserId(authentication);
        return ResponseEntity.ok(userAdminService.updateStaffUser(id, request, callerUserId));
    }

    @PatchMapping("/{id}/permissions")
    public ResponseEntity<StaffUserResponse> updatePermissions(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserPermissionsRequest request
    ) {
        return ResponseEntity.ok(userAdminService.updatePermissions(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<StaffUserResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            Authentication authentication
    ) {
        UUID callerUserId = extractUserId(authentication);
        return ResponseEntity.ok(userAdminService.updateStatus(id, request, callerUserId));
    }

    @PostMapping("/{id}/reset-credentials")
    public ResponseEntity<StaffUserResponse> resetCredentials(
            @PathVariable UUID id,
            @Valid @RequestBody ResetCredentialsRequest request,
            Authentication authentication
    ) {
        UUID callerUserId = extractUserId(authentication);
        String callerEmail = extractUserEmail(authentication);
        return ResponseEntity.ok(userAdminService.resetCredentials(id, request, callerUserId, callerEmail));
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
