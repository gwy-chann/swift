package com.swift.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
    @NotBlank(message = "Username or email is required.")
    String email,

    String password,

    @NotNull(message = "Selected role is required.")
    String selectedRole,

    boolean rememberTerminal
) {}
