package com.swift.modules.analytics.service;

import com.swift.modules.analytics.dto.*;

import java.time.LocalDate;
import java.util.List;

public interface AnalyticsService {

    ExecutiveKpiDto getExecutiveKpis(LocalDate date);

    WeeklyRevenueDto getRevenueTrend(LocalDate endDate);

    CategoryPnlDto getCategoryPnl(String period, LocalDate startDate, LocalDate endDate);

    List<ServiceBayDisplayDto> getServiceBays();

    ExecutiveDashboardResponseDto getExecutiveDashboard(LocalDate date, String period);

    UpdateWorkOrderResponseDto updateWorkOrderStatus(String orderId, UpdateWorkOrderStatusRequest request);
}
