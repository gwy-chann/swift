package com.swift.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetCredentialsRequest(
        @NotBlank(message = "Password cannot be blank")
        @Size(min = 6, message = "Password must be at least 6 characters in length")
        String password,

        @NotBlank(message = "PIN cannot be blank")
        @Pattern(regexp = "^\\d{4,6}$", message = "PIN must consist of 4 to 6 numeric digits.")
        String pin
) {}
