package com.swift.modules.admin.service.impl;

import com.swift.modules.admin.dto.*;
import com.swift.modules.admin.exception.DuplicateEmailException;
import com.swift.modules.admin.exception.InvalidRoleException;
import com.swift.modules.admin.exception.SelfLockoutException;
import com.swift.modules.admin.exception.UserNotFoundException;
import com.swift.modules.admin.service.SecurityAuditService;
import com.swift.modules.admin.service.UserAdminService;
import com.swift.modules.auth.model.StaffPermissions;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.StaffProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class UserAdminServiceImpl implements UserAdminService {

    private static final String USER_NOT_FOUND_MSG = "User not found with id: ";
    private static final String DEFAULT_TERMINAL_IP = "192.168.1.100 (Admin PC)";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@swift.ph";
    private static final String ROLE_ADMIN = "admin";
    private static final Set<String> ALLOWED_PROVISION_ROLES = Set.of("cashier", "mechanic", "inventory_clerk");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StaffProfileRepository profileRepository;
    private final SecurityAuditService securityAuditService;

    public UserAdminServiceImpl(
            StaffProfileRepository profileRepository,
            SecurityAuditService securityAuditService
    ) {
        this.profileRepository = profileRepository;
        this.securityAuditService = securityAuditService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffUserResponse> listStaffUsers() {
        return profileRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StaffUserResponse getStaffUser(UUID id) {
        return profileRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + id));
    }

    @Override
    @Transactional
    public StaffUserResponse provisionStaffUser(ProvisionStaffUserRequest request, UUID callerUserId, String callerEmail) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (profileRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateEmailException("An account with this email address already exists");
        }

        String rawRole = request.role() != null ? request.role().trim().toLowerCase() : "";
        if (!ALLOWED_PROVISION_ROLES.contains(rawRole)) {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("email", normalizedEmail);
            metadata.put("attemptedRole", rawRole);

            securityAuditService.logSecurityEvent(
                    new LogSecurityEventRequest(
                            "Rejected unauthorized staff provisioning attempt with unapproved role: " + rawRole,
                            "warning",
                            DEFAULT_TERMINAL_IP,
                            metadata,
                            callerEmail != null ? callerEmail : DEFAULT_ADMIN_EMAIL
                    ),
                    callerUserId,
                    callerEmail
            );

            throw new InvalidRoleException("Staff account role must be strictly one of: cashier, mechanic, or inventory_clerk");
        }

        StaffPermissions permissions = mergePermissions(rawRole, request.permissions());

        String pinCode;
        if (request.password() != null && request.password().length() <= 10 && request.password().matches("\\d{4,6}")) {
            pinCode = request.password();
        } else {
            pinCode = String.valueOf(RANDOM.nextInt(1000, 10000));
        }

        UUID newId = UUID.randomUUID();
        StaffProfile profile = new StaffProfile(
                newId,
                normalizedEmail,
                request.fullName().trim(),
                rawRole,
                "Active",
                pinCode,
                permissions
        );
        profile.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        profile.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        StaffProfile saved = profileRepository.save(profile);

        // Security event logging
        String roleDisplay = mapRoleToDisplay(rawRole);
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("email", normalizedEmail);
        metadata.put("fullName", saved.getFullName());
        metadata.put("role", rawRole);
        metadata.put("permissions", permissions);

        securityAuditService.logSecurityEvent(
                new LogSecurityEventRequest(
                        "Created employee account for " + normalizedEmail + " (" + roleDisplay + ")",
                        "info",
                        DEFAULT_TERMINAL_IP,
                        metadata,
                        callerEmail != null ? callerEmail : DEFAULT_ADMIN_EMAIL
                ),
                callerUserId,
                callerEmail
        );

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse updateStaffUser(UUID id, UpdateStaffUserRequest request, UUID callerUserId) {
        StaffProfile existing = profileRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + id));

        // Self-demotion guard
        if (callerUserId != null && callerUserId.equals(id)
                && ROLE_ADMIN.equalsIgnoreCase(existing.getRole())
                && request.role() != null && !request.role().isBlank()
                && !ROLE_ADMIN.equalsIgnoreCase(request.role().trim())) {
            throw new SelfLockoutException("Admin self-demotion is prohibited to prevent system lockout.");
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            existing.setFullName(request.fullName().trim());
        }

        if (request.role() != null && !request.role().isBlank()) {
            existing.setRole(request.role().trim().toLowerCase());
        }

        if (request.permissions() != null) {
            existing.setPermissions(mergeExisting(existing.getPermissions(), request.permissions()));
        }

        existing.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        StaffProfile updated = profileRepository.save(existing);

        String roleDisplay = mapRoleToDisplay(updated.getRole());
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("targetUserId", id.toString());
        metadata.put("targetEmail", updated.getEmail());
        metadata.put("updatedRole", updated.getRole());
        metadata.put("updatedPermissions", updated.getPermissions());

        securityAuditService.logSecurityEvent(
                new LogSecurityEventRequest(
                        "Updated employee account for " + updated.getEmail() + " (Role: " + roleDisplay + ")",
                        "info",
                        DEFAULT_TERMINAL_IP,
                        metadata,
                        DEFAULT_ADMIN_EMAIL
                ),
                callerUserId,
                DEFAULT_ADMIN_EMAIL
        );

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public StaffUserResponse updatePermissions(UUID id, UpdateUserPermissionsRequest request) {
        StaffProfile existing = profileRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + id));

        StaffPermissions merged = mergeExisting(existing.getPermissions(), request.permissions());
        existing.setPermissions(merged);
        existing.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        StaffProfile updated = profileRepository.save(existing);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public StaffUserResponse updateStatus(UUID id, UpdateUserStatusRequest request, UUID callerUserId) {
        StaffProfile existing = profileRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(USER_NOT_FOUND_MSG + id));

        String newStatus = request.status().trim();

        // Self-lockout check: Admin cannot deactivate their own profile
        if (callerUserId != null && callerUserId.equals(id)
                && ROLE_ADMIN.equalsIgnoreCase(existing.getRole())
                && !"Active".equalsIgnoreCase(newStatus)) {
            throw new SelfLockoutException("Self-deactivation is prohibited");
        }

        existing.setStatus(newStatus);
        existing.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        StaffProfile updated = profileRepository.save(existing);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", id.toString());
        metadata.put("email", updated.getEmail());
        metadata.put("status", newStatus);

        securityAuditService.logSecurityEvent(
                new LogSecurityEventRequest(
                        "Toggled status of employee " + updated.getEmail() + " to " + newStatus,
                        "Inactive".equalsIgnoreCase(newStatus) ? "warning" : "info",
                        DEFAULT_TERMINAL_IP,
                        metadata,
                        DEFAULT_ADMIN_EMAIL
                ),
                callerUserId,
                DEFAULT_ADMIN_EMAIL
        );

        return mapToResponse(updated);
    }

    private StaffPermissions mergePermissions(String role, StaffPermissions custom) {
        StaffPermissions defaults = StaffPermissions.forRole(role);
        if (custom == null) {
            return defaults;
        }
        return mergeExisting(defaults, custom);
    }

    private StaffPermissions mergeExisting(StaffPermissions base, StaffPermissions overrides) {
        if (base == null) base = new StaffPermissions();
        if (overrides == null) return base;

        StaffPermissions merged = new StaffPermissions();
        merged.setCanAdjustStock(overrides.isCanAdjustStock() || base.isCanAdjustStock());
        merged.setCanOverrideDiscount(overrides.isCanOverrideDiscount() || base.isCanOverrideDiscount());
        merged.setCanManagePricing(overrides.isCanManagePricing() || base.isCanManagePricing());
        merged.setCanViewReports(overrides.isCanViewReports() || base.isCanViewReports());
        merged.setCanDiscount(overrides.isCanDiscount() || base.isCanDiscount());
        merged.setCanVoidTransaction(overrides.isCanVoidTransaction() || base.isCanVoidTransaction());
        merged.setCanAccessAdmin(overrides.isCanAccessAdmin() || base.isCanAccessAdmin());
        return merged;
    }

    private String mapRoleToDisplay(String role) {
        if (role == null) return "Staff";
        return switch (role.toLowerCase()) {
            case "admin" -> "Admin";
            case "cashier" -> "Cashier";
            case "mechanic" -> "Mechanic";
            case "inventory_clerk" -> "Inventory Clerk";
            default -> "Staff";
        };
    }

    private StaffUserResponse mapToResponse(StaffProfile profile) {
        return new StaffUserResponse(
                profile.getId(),
                profile.getEmail(),
                profile.getFullName(),
                profile.getRole(),
                mapRoleToDisplay(profile.getRole()),
                profile.getStatus(),
                profile.getPermissions() != null ? profile.getPermissions() : StaffPermissions.forRole(profile.getRole()),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
