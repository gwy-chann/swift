package com.swift.modules.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class CookieAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // If already authenticated by Bearer token, skip cookie inspection
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                String sessionRole = null;
                String staffSession = null;
                String userName = null;
                boolean adminElevated = false;

                for (Cookie cookie : cookies) {
                    if ("swift-session-role".equals(cookie.getName())) {
                        sessionRole = cookie.getValue();
                    } else if ("swift-staff-session".equals(cookie.getName())) {
                        staffSession = cookie.getValue();
                    } else if ("swift-user-name".equals(cookie.getName())) {
                        userName = cookie.getValue();
                    } else if ("swift_admin_elevated".equals(cookie.getName())) {
                        adminElevated = "true".equalsIgnoreCase(cookie.getValue());
                    }
                }

                if (sessionRole != null && !sessionRole.isBlank()) {
                    UUID userId;
                    try {
                        userId = staffSession != null ? UUID.fromString(staffSession) : UUID.nameUUIDFromBytes(sessionRole.getBytes());
                    } catch (IllegalArgumentException e) {
                        userId = UUID.nameUUIDFromBytes(sessionRole.getBytes());
                    }

                    String displayName = userName != null ? userName : ("admin".equalsIgnoreCase(sessionRole) ? "Administrator" : "Staff Member");
                    String email = "admin".equalsIgnoreCase(sessionRole) ? "admin@swift.local" : "cashier@swift.local";

                    SwiftUserPrincipal principal = new SwiftUserPrincipal(
                        userId,
                        email,
                        displayName,
                        sessionRole,
                        SwiftUserPrincipal.AuthSource.SESSION_COOKIE,
                        adminElevated
                    );

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
