package com.swift.modules.admin.dto;

import com.swift.modules.auth.model.StaffPermissions;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ProvisionStaffUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Full name is required")
    String fullName,

    @NotBlank(message = "Role is required")
    String role,

    String password,

    StaffPermissions permissions
) {}
