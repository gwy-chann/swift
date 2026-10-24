package com.swift.modules.auth.dto;

public record UserSessionDto(
    String id,
    String email,
    String name,
    String role,
    String terminalId,
    long expiresAt
) {}
