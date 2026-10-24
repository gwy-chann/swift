package com.swift.modules.admin.dto;

import com.swift.modules.auth.model.StaffPermissions;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StaffUserResponse(
    UUID id,
    String email,
    String fullName,
    String role,
    String roleDisplay,
    String status,
    StaffPermissions permissions,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
