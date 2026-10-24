package com.swift.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record KioskAuthRequest(
    @NotBlank(message = "Profile ID is required.")
    String profileId,

    @NotBlank(message = "PIN is required.")
    @Pattern(regexp = "^\\d{4}$", message = "PIN must be exactly 4 numeric digits.")
    String pin
) {}
