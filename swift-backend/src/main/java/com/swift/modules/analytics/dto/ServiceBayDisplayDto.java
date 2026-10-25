package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Service bay card representation with active work order details.
 */
public record ServiceBayDisplayDto(
    @JsonProperty("id") String id,
    @JsonProperty("bayName") String bayName,
    @JsonProperty("status") String status,
    @JsonProperty("vehicleService") String vehicleService,
    @JsonProperty("mechanicInfo") String mechanicInfo
) {}
