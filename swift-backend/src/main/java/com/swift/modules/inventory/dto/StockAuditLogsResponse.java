package com.swift.modules.inventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StockAuditLogsResponse(
    boolean success,
    List<StockAuditLogDto> logs,
    StockAuditSummaryMetricsDto metrics,
    long total,
    String error
) {
    public static StockAuditLogsResponse success(List<StockAuditLogDto> logs, StockAuditSummaryMetricsDto metrics, long total) {
        return new StockAuditLogsResponse(true, logs, metrics, total, null);
    }

    public static StockAuditLogsResponse failure(String error) {
        return new StockAuditLogsResponse(false, List.of(), new StockAuditSummaryMetricsDto(0, 0, 0, 0), 0, error);
    }
}
