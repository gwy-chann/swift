package com.swift.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/**
 * Standardized RFC 7807 problem detail payload.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorDetails(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    List<String> validationErrors
) {}
