package com.swift.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record KioskAuthResponse(
    boolean success,
    StaffProfileDto profile,
    String error,
    String code
) {
    public static KioskAuthResponse ok(StaffProfileDto profile) {
        return new KioskAuthResponse(true, profile, null, null);
    }

    public static KioskAuthResponse failure(String error, String code) {
        return new KioskAuthResponse(false, null, error, code);
    }
}
