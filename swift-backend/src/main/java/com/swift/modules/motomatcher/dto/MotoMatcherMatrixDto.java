package com.swift.modules.motomatcher.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MotoMatcherMatrixDto(
    @JsonProperty("oem_parts") List<MotoMatcherMatrixPartDto> oemParts,
    @JsonProperty("aftermarket_parts") List<MotoMatcherMatrixPartDto> aftermarketParts
) {
    public static MotoMatcherMatrixDto empty() {
        return new MotoMatcherMatrixDto(List.of(), List.of());
    }
}
