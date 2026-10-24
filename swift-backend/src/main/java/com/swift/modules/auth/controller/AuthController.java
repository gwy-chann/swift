package com.swift.modules.auth.controller;

import com.swift.modules.auth.dto.AuthResponse;
import com.swift.modules.auth.dto.LoginRequest;
import com.swift.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Core user login and session termination endpoints")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user credentials and issue session cookies")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse result = authService.login(request, response);
        if (result.success()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Terminate session and clear all authentication cookies")
    public ResponseEntity<Map<String, Object>> logout(HttpServletResponse response) {
        return ResponseEntity.ok(authService.logout(response));
    }
}
