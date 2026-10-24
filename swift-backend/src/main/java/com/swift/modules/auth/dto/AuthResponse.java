package com.swift.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthResponse(
    boolean success,
    String redirectTo,
    UserSessionDto session,
    String error,
    String code
) {
    public static AuthResponse ok(String redirectTo, UserSessionDto session) {
        return new AuthResponse(true, redirectTo, session, null, null);
    }

    public static AuthResponse failure(String error, String code) {
        return new AuthResponse(false, null, null, error, code);
    }
}
