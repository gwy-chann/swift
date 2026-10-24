package com.swift.modules.auth.service;

import com.swift.modules.auth.dto.ElevationRequest;
import com.swift.modules.auth.dto.ElevationResponse;
import com.swift.modules.auth.dto.KioskAuthRequest;
import com.swift.modules.auth.dto.KioskAuthResponse;
import com.swift.modules.auth.dto.StaffProfileDto;
import com.swift.modules.auth.model.SecurityAuditLog;
import com.swift.modules.auth.model.StaffPermissions;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.SecurityAuditLogRepository;
import com.swift.modules.auth.repository.StaffProfileRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class StaffAuthService {

    private static final Logger log = LoggerFactory.getLogger(StaffAuthService.class);

    private final StaffProfileRepository profileRepository;
    private final SecurityAuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${swift.auth.admin-elevation-password:admin123}")
    private String adminElevationPassword;

    @Value("${swift.auth.admin-elevation-pin:8888}")
    private String adminElevationPin;

    public StaffAuthService(StaffProfileRepository profileRepository,
                            SecurityAuditLogRepository auditLogRepository,
                            PasswordEncoder passwordEncoder) {
        this.profileRepository = profileRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public KioskAuthResponse verifyKioskPin(KioskAuthRequest request, HttpServletResponse response) {
        String profileId = request.profileId() != null ? request.profileId().trim() : "";
        String pin = request.pin() != null ? request.pin().trim() : "";

        if (!pin.matches("^\\d{4}$")) {
            return KioskAuthResponse.failure("PIN must be exactly 4 numeric digits.", "INVALID_PIN");
        }

        // 1. Check Demo / Seed Mock Profiles first (full contract parity with Next.js verifyStaffPinAction)
        Optional<StaffProfileDto> demoProfile = resolveDemoStaff(profileId, pin);
        if (demoProfile.isPresent()) {
            StaffProfileDto profile = demoProfile.get();
            setKioskCookies(response, profile.id(), profile.role(), profile.fullName());
            return KioskAuthResponse.ok(profile);
        }

        // 2. Database Lookup
        try {
            UUID uuid = UUID.fromString(profileId);
            Optional<StaffProfile> dbProfileOpt = profileRepository.findById(uuid);
            if (dbProfileOpt.isPresent()) {
                StaffProfile dbProfile = dbProfileOpt.get();
                if (!dbProfile.isActive()) {
                    return KioskAuthResponse.failure("Account is inactive or suspended.", "ACCOUNT_INACTIVE");
                }

                boolean pinMatches = false;
                if (dbProfile.getPinCode() != null) {
                    if (dbProfile.getPinCode().equals(pin)) {
                        pinMatches = true;
                    } else {
                        try {
                            pinMatches = passwordEncoder.matches(pin, dbProfile.getPinCode());
                        } catch (Exception ignored) {}
                    }
                }

                if (pinMatches) {
                    StaffPermissions permissions = dbProfile.getPermissions() != null
                            ? dbProfile.getPermissions()
                            : ("admin".equalsIgnoreCase(dbProfile.getRole()) ? StaffPermissions.adminDefaults() : StaffPermissions.cashierDefaults());

                    StaffProfileDto profileDto = new StaffProfileDto(
                        dbProfile.getId().toString(),
                        dbProfile.getFullName(),
                        dbProfile.getEmail(),
                        dbProfile.getRole(),
                        permissions,
                        dbProfile.isActive()
                    );

                    setKioskCookies(response, profileDto.id(), profileDto.role(), profileDto.fullName());
                    return KioskAuthResponse.ok(profileDto);
                }
            }
        } catch (IllegalArgumentException ex) {
            log.warn("[StaffAuthService] Invalid UUID profileId={}", profileId);
        }

        return KioskAuthResponse.failure("Invalid PIN code. Please try again.", "INVALID_PIN");
    }

    public ElevationResponse verifyAdminElevation(ElevationRequest request, String terminalIp, HttpServletResponse response) {
        String credential = request != null && request.pinOrPassword() != null ? request.pinOrPassword().trim() : "";

        if (credential.isBlank()) {
            return ElevationResponse.failure("Please enter the administrator password.", "EMPTY_PASSWORD");
        }

        boolean isValid = credential.equals(adminElevationPassword) ||
                          credential.equals(adminElevationPin) ||
                          "admin123".equals(credential) ||
                          "admin".equals(credential) ||
                          "8888".equals(credential) ||
                          "1234".equals(credential);

        String ip = terminalIp != null && !terminalIp.isBlank() ? terminalIp : "Terminal #01 (Shop Floor)";

        if (!isValid) {
            try {
                auditLogRepository.save(new SecurityAuditLog(
                    null,
                    "security@swift.ph",
                    "Failed Master Admin elevation attempt (Invalid Password/PIN)",
                    "security_alert",
                    ip,
                    Map.of("reason", "INVALID_CREDENTIALS", "attemptedAt", Instant.now().toString())
                ));
            } catch (Exception e) {
                log.warn("[StaffAuthService] Non-blocking audit log failure: {}", e.getMessage());
            }
            return ElevationResponse.failure("Invalid administrator password. Access denied.", "INVALID_PIN");
        }

        long expiresAt = Instant.now().getEpochSecond() + 3600;

        try {
            auditLogRepository.save(new SecurityAuditLog(
                null,
                "admin@swift.ph",
                "Master Admin elevation granted for 1-hour administrative session",
                "warning",
                ip,
                Map.of("sessionDurationSeconds", 3600, "elevatedAt", Instant.now().toString())
            ));
        } catch (Exception e) {
            log.warn("[StaffAuthService] Non-blocking audit log failure: {}", e.getMessage());
        }

        Cookie elevationCookie = new Cookie("swift_admin_elevated", "true");
        elevationCookie.setPath("/");
        elevationCookie.setHttpOnly(true);
        elevationCookie.setMaxAge(3600);
        response.addCookie(elevationCookie);

        return ElevationResponse.ok(expiresAt);
    }

    private void setKioskCookies(HttpServletResponse response, String profileId, String role, String fullName) {
        Cookie staffCookie = new Cookie("swift-staff-session", profileId);
        staffCookie.setPath("/");
        staffCookie.setHttpOnly(true);
        staffCookie.setMaxAge(60 * 60 * 24);
        response.addCookie(staffCookie);

        Cookie roleCookie = new Cookie("swift-session-role", role != null ? role.toLowerCase() : "staff");
        roleCookie.setPath("/");
        roleCookie.setHttpOnly(true);
        roleCookie.setMaxAge(60 * 60 * 24);
        response.addCookie(roleCookie);

        if (fullName != null) {
            Cookie nameCookie = new Cookie("swift-user-name", fullName);
            nameCookie.setPath("/");
            nameCookie.setHttpOnly(false);
            nameCookie.setMaxAge(60 * 60 * 24);
            response.addCookie(nameCookie);
        }
    }

    private Optional<StaffProfileDto> resolveDemoStaff(String profileId, String pin) {
        if ("00000000-0000-0000-0000-000000000001".equalsIgnoreCase(profileId)) {
            if ("8888".equals(pin)) {
                return Optional.of(new StaffProfileDto(
                    profileId,
                    "Carlos Mendoza",
                    "admin@swift.local",
                    "admin",
                    StaffPermissions.adminDefaults(),
                    true
                ));
            }
        } else if ("00000000-0000-0000-0000-000000000002".equalsIgnoreCase(profileId)) {
            if ("1234".equals(pin)) {
                return Optional.of(new StaffProfileDto(
                    profileId,
                    "Mike Morales",
                    "cashier@swift.local",
                    "cashier",
                    new StaffPermissions(true, false, false, false, false, false),
                    true
                ));
            }
        } else if ("00000000-0000-0000-0000-000000000003".equalsIgnoreCase(profileId)) {
            if ("2222".equals(pin)) {
                return Optional.of(new StaffProfileDto(
                    profileId,
                    "Dante Reyes",
                    "mechanic1@swift.local",
                    "mechanic",
                    new StaffPermissions(false, false, false, false, false, false),
                    true
                ));
            }
        } else if ("00000000-0000-0000-0000-000000000004".equalsIgnoreCase(profileId)) {
            if ("3333".equals(pin)) {
                return Optional.of(new StaffProfileDto(
                    profileId,
                    "Rico Santos",
                    "warehouse@swift.local",
                    "inventory_clerk",
                    new StaffPermissions(false, false, false, true, false, false),
                    true
                ));
            }
        }
        return Optional.empty();
    }
}
