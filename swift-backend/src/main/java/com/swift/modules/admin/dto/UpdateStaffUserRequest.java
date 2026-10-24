package com.swift.modules.admin.dto;

import com.swift.modules.auth.model.StaffPermissions;

public record UpdateStaffUserRequest(
    String fullName,
    String role,
    StaffPermissions permissions
) {}
