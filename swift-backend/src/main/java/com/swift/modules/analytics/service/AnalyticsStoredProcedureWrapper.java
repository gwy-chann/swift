package com.swift.modules.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.analytics.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Spring JDBC wrapper executing native PostgreSQL PL/pgSQL stored procedures:
 * - public.get_executive_kpis(p_date)
 * - public.get_revenue_trend_7d(p_end_date)
 * - public.get_category_pnl(p_start_date, p_end_date)
 */
@Component
public class AnalyticsStoredProcedureWrapper {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsStoredProcedureWrapper.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AnalyticsStoredProcedureWrapper(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<ExecutiveKpiDto> callGetExecutiveKpis(LocalDate date) {
        try {
            LocalDate queryDate = (date != null) ? date : LocalDate.now(ZoneOffset.UTC);
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.get_executive_kpis(?::date)::text",
                String.class,
                queryDate.toString()
            );

            if (jsonResult != null) {
                JsonNode node = objectMapper.readTree(jsonResult);
                ExecutiveKpiDto dto = new ExecutiveKpiDto(
                    toBigDecimal(node.get("gross_revenue_today")),
                    toBigDecimal(node.get("gross_revenue_yesterday")),
                    toBigDecimal(node.get("revenue_growth_pct")),
                    toInt(node.get("active_work_orders_count")),
                    toInt(node.get("pending_parts_count")),
                    toBigDecimal(node.get("net_profit_margin_pct")),
                    toBigDecimal(node.get("gross_profit_amount")),
                    toInt(node.get("critical_low_stock_count"))
                );
                return Optional.of(dto);
            }
        } catch (Exception ex) {
            log.debug("Native get_executive_kpis stored procedure call unavailable: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    public Optional<WeeklyRevenueDto> callGetRevenueTrend7d(LocalDate endDate) {
        try {
            LocalDate queryEndDate = (endDate != null) ? endDate : LocalDate.now(ZoneOffset.UTC);
            List<RevenueTrendDayDto> days = jdbcTemplate.query(
                "SELECT date::text, day_label, parts_amount, labor_amount, total_amount, " +
                "parts_height_percent, labor_height_percent FROM public.get_revenue_trend_7d(?::date)",
                (rs, rowNum) -> new RevenueTrendDayDto(
                    rs.getString("date"),
                    rs.getString("day_label"),
                    rs.getBigDecimal("parts_amount"),
                    "₱" + rs.getBigDecimal("parts_amount"),
                    rs.getBigDecimal("labor_amount"),
                    "₱" + rs.getBigDecimal("labor_amount"),
                    rs.getBigDecimal("total_amount"),
                    rs.getDouble("parts_height_percent"),
                    rs.getDouble("labor_height_percent")
                ),
                queryEndDate.toString()
            );

            if (days != null && !days.isEmpty()) {
                BigDecimal peakDay = BigDecimal.ZERO;
                BigDecimal partsTotal = BigDecimal.ZERO;
                BigDecimal laborTotal = BigDecimal.ZERO;
                BigDecimal totalRev = BigDecimal.ZERO;

                for (RevenueTrendDayDto day : days) {
                    if (day.totalAmount() != null && day.totalAmount().compareTo(peakDay) > 0) {
                        peakDay = day.totalAmount();
                    }
                    if (day.partsAmount() != null) {
                        partsTotal = partsTotal.add(day.partsAmount());
                    }
                    if (day.laborAmount() != null) {
                        laborTotal = laborTotal.add(day.laborAmount());
                    }
                    if (day.totalAmount() != null) {
                        totalRev = totalRev.add(day.totalAmount());
                    }
                }

                return Optional.of(new WeeklyRevenueDto(days, peakDay, partsTotal, laborTotal, totalRev));
            }
        } catch (Exception ex) {
            log.debug("Native get_revenue_trend_7d stored procedure call unavailable: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    public Optional<CategoryPnlDto> callGetCategoryPnl(OffsetDateTime startDate, OffsetDateTime endDate) {
        try {
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.get_category_pnl(?::timestamptz, ?::timestamptz)::text",
                String.class,
                startDate.toString(),
                endDate.toString()
            );

            if (jsonResult != null) {
                JsonNode root = objectMapper.readTree(jsonResult);
                JsonNode categoriesNode = root.get("categories");
                JsonNode summaryNode = root.get("summary");

                List<CategoryPnlItemDto> categories = new ArrayList<>();
                if (categoriesNode != null && categoriesNode.isArray()) {
                    for (JsonNode item : categoriesNode) {
                        categories.add(new CategoryPnlItemDto(
                            item.path("category").asText(),
                            item.path("units_sold").asInt(),
                            toBigDecimal(item.get("gross_revenue")),
                            toBigDecimal(item.get("cogs")),
                            toBigDecimal(item.get("net_profit")),
                            item.path("margin_pct").asDouble()
                        ));
                    }
                }

                CategoryPnlSummaryDto summary = summaryNode != null ? new CategoryPnlSummaryDto(
                    summaryNode.path("total_units_sold").asInt(),
                    toBigDecimal(summaryNode.get("total_gross_revenue")),
                    toBigDecimal(summaryNode.get("total_cogs")),
                    toBigDecimal(summaryNode.get("total_net_profit")),
                    summaryNode.path("overall_margin_pct").asDouble()
                ) : CategoryPnlSummaryDto.empty();

                return Optional.of(new CategoryPnlDto(categories, summary));
            }
        } catch (Exception ex) {
            log.debug("Native get_category_pnl stored procedure call unavailable: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    private BigDecimal toBigDecimal(JsonNode node) {
        if (node == null || node.isNull()) {
            return BigDecimal.ZERO;
        }
        if (node.isNumber()) {
            return node.decimalValue();
        }
        try {
            return new BigDecimal(node.asText());
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private Integer toInt(JsonNode node) {
        if (node == null || node.isNull()) {
            return 0;
        }
        return node.asInt(0);
    }
}
