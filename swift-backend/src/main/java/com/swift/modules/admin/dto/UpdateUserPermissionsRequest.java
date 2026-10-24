package com.swift.modules.admin.dto;

import com.swift.modules.auth.model.StaffPermissions;
import jakarta.validation.constraints.NotNull;

public record UpdateUserPermissionsRequest(
    @NotNull(message = "Permissions payload is required")
    StaffPermissions permissions
) {}
