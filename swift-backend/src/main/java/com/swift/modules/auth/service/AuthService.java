package com.swift.modules.auth.service;

import com.swift.modules.auth.dto.AuthResponse;
import com.swift.modules.auth.dto.LoginRequest;
import com.swift.modules.auth.dto.UserSessionDto;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.StaffProfileRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final StaffProfileRepository profileRepository;

    public AuthService(StaffProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        if (email.isBlank()) {
            return AuthResponse.failure("Username or email is required.", "INVALID_CREDENTIALS");
        }

        String selectedRole = request.selectedRole() != null ? request.selectedRole().toLowerCase() : "staff";
        String targetRedirect = "admin".equalsIgnoreCase(selectedRole) ? "/admin" : "/staff/pos";
        int maxAge = request.rememberTerminal() ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

        // 1. Demo accounts bypass check matching Next.js resolveDemoAccount()
        if ("admin@swift.local".equalsIgnoreCase(email)) {
            UserSessionDto session = new UserSessionDto(
                "00000000-0000-0000-0000-000000000001",
                "admin@swift.local",
                "Shop Administrator",
                "admin",
                null,
                Instant.now().getEpochSecond() + maxAge
            );
            setSessionCookies(response, "admin", "Shop Administrator", maxAge);
            return AuthResponse.ok(targetRedirect, session);
        }

        if ("cashier@swift.local".equalsIgnoreCase(email)) {
            UserSessionDto session = new UserSessionDto(
                "00000000-0000-0000-0000-000000000002",
                "cashier@swift.local",
                "Shop Floor Cashier",
                "staff",
                null,
                Instant.now().getEpochSecond() + maxAge
            );
            setSessionCookies(response, "staff", "Shop Floor Cashier", maxAge);
            return AuthResponse.ok(targetRedirect, session);
        }

        // 2. Database Profile Lookup
        Optional<StaffProfile> profileOpt = profileRepository.findByEmailIgnoreCase(email);
        if (profileOpt.isPresent()) {
            StaffProfile profile = profileOpt.get();
            if (!profile.isActive()) {
                return AuthResponse.failure("Account is inactive or suspended.", "ACCOUNT_LOCKED");
            }

            String name = profile.getFullName() != null ? profile.getFullName() : profile.getEmail().split("@")[0];
            String role = profile.getRole() != null ? profile.getRole() : selectedRole;

            UserSessionDto session = new UserSessionDto(
                profile.getId().toString(),
                profile.getEmail(),
                name,
                role,
                null,
                Instant.now().getEpochSecond() + maxAge
            );

            setSessionCookies(response, role, name, maxAge);
            return AuthResponse.ok(targetRedirect, session);
        }

        // 3. User not found
        log.warn("[AuthService] Invalid credentials attempt for email={}", email);
        return AuthResponse.failure("Invalid email or password. Please check your credentials.", "INVALID_CREDENTIALS");
    }

    public Map<String, Object> logout(HttpServletResponse response) {
        clearSessionCookies(response);
        return Map.of("success", true, "redirectTo", "/");
    }

    private void setSessionCookies(HttpServletResponse response, String role, String name, int maxAge) {
        Cookie roleCookie = new Cookie("swift-session-role", role);
        roleCookie.setPath("/");
        roleCookie.setHttpOnly(true);
        roleCookie.setMaxAge(maxAge);
        response.addCookie(roleCookie);

        Cookie nameCookie = new Cookie("swift-user-name", name);
        nameCookie.setPath("/");
        nameCookie.setHttpOnly(false); // Accessible to frontend UI for greeting
        nameCookie.setMaxAge(maxAge);
        response.addCookie(nameCookie);
    }

    private void clearSessionCookies(HttpServletResponse response) {
        String[] cookieNames = {"swift-session-role", "swift-user-name", "swift-staff-session", "swift_admin_elevated"};
        for (String name : cookieNames) {
            Cookie cookie = new Cookie(name, "");
            cookie.setPath("/");
            cookie.setMaxAge(0);
            cookie.setHttpOnly(true);
            response.addCookie(cookie);
        }
    }
}
