package com.swift.modules.analytics.controller;

import com.swift.modules.analytics.dto.*;
import com.swift.modules.analytics.service.AnalyticsService;
import com.swift.modules.analytics.service.CsvExportService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.PATCH, RequestMethod.OPTIONS})
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final CsvExportService csvExportService;

    public AnalyticsController(AnalyticsService analyticsService, CsvExportService csvExportService) {
        this.analyticsService = analyticsService;
        this.csvExportService = csvExportService;
    }

    /**
     * Aggregated Executive Dashboard telemetry endpoint dispatched concurrently
     * via Java 21 StructuredTaskScope on virtual threads.
     */
    @GetMapping({"/kpis", "/dashboard"})
    public ResponseEntity<ExecutiveDashboardResponseDto> getDashboardTelemetry(
        @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(value = "period", required = false, defaultValue = "daily") String period
    ) {
        LocalDate queryDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        ExecutiveDashboardResponseDto dashboard = analyticsService.getExecutiveDashboard(queryDate, period);
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Rolling 7-day revenue trend split by parts counter and workshop labor.
     */
    @GetMapping("/revenue-trend")
    public ResponseEntity<WeeklyRevenueDto> getRevenueTrend(
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate queryEndDate = endDate != null ? endDate : LocalDate.now(ZoneOffset.UTC);
        WeeklyRevenueDto trend = analyticsService.getRevenueTrend(queryEndDate);
        return ResponseEntity.ok(trend);
    }

    /**
     * Categorized P&L and COGS breakdown for a specified period (daily, weekly, monthly, annual).
     */
    @GetMapping({"/category-pnl", "/category-pnl-breakdown"})
    public ResponseEntity<CategoryPnlDto> getCategoryPnl(
        @RequestParam(value = "period", required = false, defaultValue = "daily") String period,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        CategoryPnlDto pnl = analyticsService.getCategoryPnl(period, startDate, endDate);
        return ResponseEntity.ok(pnl);
    }

    /**
     * Active workshop service bay queue and mechanic utilization status.
     */
    @GetMapping("/service-bays")
    public ResponseEntity<List<ServiceBayDisplayDto>> getServiceBays() {
        List<ServiceBayDisplayDto> bays = analyticsService.getServiceBays();
        return ResponseEntity.ok(bays);
    }

    /**
     * Updates the operational status of an active workshop repair work order.
     */
    @PatchMapping("/work-orders/{id}/status")
    public ResponseEntity<UpdateWorkOrderResponseDto> updateWorkOrderStatus(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateWorkOrderStatusRequest request
    ) {
        UpdateWorkOrderResponseDto response = analyticsService.updateWorkOrderStatus(id, request);
        if (!response.success()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Non-blocking streamed accounting CSV export using StreamingResponseBody.
     * Prevents heap buffer overflow when streaming large accounting datasets.
     */
    @GetMapping("/accounting-csv")
    public ResponseEntity<StreamingResponseBody> exportAccountingCsv(
        @RequestParam(value = "period", required = false, defaultValue = "daily") String period,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        String filename = csvExportService.generateFilename(now);
        StreamingResponseBody responseBody = csvExportService.exportAccountingCsv(period, startDate, endDate);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(responseBody);
    }

    /**
     * Benchmark streaming endpoint for memory profiling under 100,000+ row exports.
     */
    @GetMapping("/benchmark-csv")
    public ResponseEntity<StreamingResponseBody> benchmarkCsv(
        @RequestParam(value = "rows", required = false, defaultValue = "100000") int rows
    ) {
        StreamingResponseBody responseBody = csvExportService.streamBenchmarkRows(rows);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"benchmark_" + rows + "_rows.csv\"")
            .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(responseBody);
    }
}
