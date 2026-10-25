package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record UpdateWorkOrderResponseDto(
    @JsonProperty("success") boolean success,
    @JsonProperty("orderId") String orderId,
    @JsonProperty("status") String status,
    @JsonProperty("updatedAt") String updatedAt,
    @JsonProperty("error") String error
) {
    public static UpdateWorkOrderResponseDto ofSuccess(String orderId, String status, String updatedAt) {
        return new UpdateWorkOrderResponseDto(true, orderId, status, updatedAt, null);
    }

    public static UpdateWorkOrderResponseDto ofFailure(String orderId, String status, String error) {
        return new UpdateWorkOrderResponseDto(false, orderId, status, null, error);
    }
}
