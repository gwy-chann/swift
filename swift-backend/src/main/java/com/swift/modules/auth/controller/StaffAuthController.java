package com.swift.modules.auth.controller;

import com.swift.modules.auth.dto.ElevationRequest;
import com.swift.modules.auth.dto.ElevationResponse;
import com.swift.modules.auth.dto.KioskAuthRequest;
import com.swift.modules.auth.dto.KioskAuthResponse;
import com.swift.modules.auth.service.StaffAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff")
@Tag(name = "Staff Authentication", description = "Shop floor kiosk PIN authentication and Master Admin elevation")
public class StaffAuthController {

    private final StaffAuthService staffAuthService;

    public StaffAuthController(StaffAuthService staffAuthService) {
        this.staffAuthService = staffAuthService;
    }

    @PostMapping("/kiosk-auth")
    @Operation(summary = "Authenticate staff member via 4-digit numeric PIN at shared kiosk")
    public ResponseEntity<KioskAuthResponse> kioskAuth(@Valid @RequestBody KioskAuthRequest request,
                                                       HttpServletResponse response) {
        KioskAuthResponse result = staffAuthService.verifyKioskPin(request, response);
        if (result.success()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/admin-elevation")
    @Operation(summary = "Authorize temporary 1-hour administrative elevation for sensitive actions")
    public ResponseEntity<ElevationResponse> adminElevation(@RequestBody(required = false) ElevationRequest request,
                                                           HttpServletRequest servletRequest,
                                                           HttpServletResponse servletResponse) {
        String clientIp = servletRequest.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = servletRequest.getRemoteAddr();
        }

        ElevationResponse result = staffAuthService.verifyAdminElevation(request, clientIp, servletResponse);
        if (result.success()) {
            return ResponseEntity.ok(result);
        } else if ("EMPTY_PASSWORD".equals(result.code())) {
            return ResponseEntity.badRequest().body(result);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }
    }
}
