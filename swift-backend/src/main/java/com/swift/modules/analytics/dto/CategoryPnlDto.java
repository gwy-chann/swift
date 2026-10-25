package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Collections;
import java.util.List;

/**
 * Categorized P&L COGS breakdown response container.
 */
public record CategoryPnlDto(
    @JsonProperty("categories") List<CategoryPnlItemDto> categories,
    @JsonProperty("summary") CategoryPnlSummaryDto summary
) {
    public static CategoryPnlDto empty() {
        return new CategoryPnlDto(
            Collections.emptyList(),
            CategoryPnlSummaryDto.empty()
        );
    }
}
