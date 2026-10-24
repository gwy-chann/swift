package com.swift.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.swift.modules.auth.model.StaffPermissions;

public record StaffProfileDto(
    String id,

    @JsonProperty("full_name")
    String fullName,

    String email,

    String role,

    StaffPermissions permissions,

    @JsonProperty("is_active")
    boolean isActive
) {}
