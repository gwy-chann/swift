package com.swift.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ElevationResponse(
    boolean success,
    boolean elevated,
    Long expiresAt,
    String error,
    String code
) {
    public static ElevationResponse ok(long expiresAt) {
        return new ElevationResponse(true, true, expiresAt, null, null);
    }

    public static ElevationResponse failure(String error, String code) {
        return new ElevationResponse(false, false, null, error, code);
    }
}
