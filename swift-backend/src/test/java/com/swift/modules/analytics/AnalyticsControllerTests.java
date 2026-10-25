package com.swift.modules.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.analytics.dto.UpdateWorkOrderStatusRequest;
import com.swift.modules.analytics.model.ServiceBay;
import com.swift.modules.analytics.model.WorkOrder;
import com.swift.modules.analytics.repository.ServiceBayRepository;
import com.swift.modules.analytics.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnalyticsControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ServiceBayRepository serviceBayRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    private UUID bayId;
    private UUID workOrderId;

    @BeforeEach
    void setUp() {
        workOrderRepository.deleteAll();
        serviceBayRepository.deleteAll();

        ServiceBay bay = new ServiceBay(null, "Bay #1 - Express", "Express", "OCCUPIED", 1);
        ServiceBay savedBay = serviceBayRepository.save(bay);
        bayId = savedBay.getId();

        WorkOrder order = new WorkOrder(null, "WO-TEST-001", bayId, "Yamaha Aerox 155", "Full CVT Cleaning", "IN PROGRESS");
        WorkOrder savedOrder = workOrderRepository.save(order);
        workOrderId = savedOrder.getId();
    }

    @Test
    @DisplayName("Scenario 1: GET /api/v1/analytics/kpis returns aggregated dashboard telemetry via virtual threads")
    void testGetDashboardTelemetry() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/kpis")
                .param("period", "daily")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpis", notNullValue()))
            .andExpect(jsonPath("$.revenueTrend", notNullValue()))
            .andExpect(jsonPath("$.categoryPnl", notNullValue()))
            .andExpect(jsonPath("$.serviceBays", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.serviceBays[0].bayName", is("Bay #1 - Express")))
            .andExpect(jsonPath("$.serviceBays[0].status", is("IN PROGRESS")));
    }

    @Test
    @DisplayName("Scenario 4: GET /api/v1/analytics/revenue-trend returns 7 days of breakdown data")
    void testGetRevenueTrend() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/revenue-trend")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.days", hasSize(7)))
            .andExpect(jsonPath("$.peakDayAmount", notNullValue()))
            .andExpect(jsonPath("$.totalWeeklyRevenue", notNullValue()));
    }

    @Test
    @DisplayName("Scenario 5: GET /api/v1/analytics/category-pnl returns categorized P&L COGS breakdown")
    void testGetCategoryPnl() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/category-pnl")
                .param("period", "monthly")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.categories", notNullValue()))
            .andExpect(jsonPath("$.summary", notNullValue()))
            .andExpect(jsonPath("$.summary.totalGrossRevenue", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/analytics/service-bays returns workshop bay queue and utilization")
    void testGetServiceBays() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/service-bays")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].bayName", is("Bay #1 - Express")))
            .andExpect(jsonPath("$[0].vehicleService", containsString("Yamaha Aerox 155")));
    }

    @Test
    @DisplayName("Scenario 3: PATCH /api/v1/analytics/work-orders/{id}/status updates order and bay utilization")
    void testUpdateWorkOrderStatus() throws Exception {
        UpdateWorkOrderStatusRequest request = new UpdateWorkOrderStatusRequest("COMPLETED", "CVT belt and rollers replaced");

        mockMvc.perform(patch("/api/v1/analytics/work-orders/" + workOrderId + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.orderId", is(workOrderId.toString())))
            .andExpect(jsonPath("$.status", is("COMPLETED")))
            .andExpect(jsonPath("$.updatedAt", notNullValue()));

        // Verify bay status freed to AVAILABLE
        ServiceBay updatedBay = serviceBayRepository.findById(bayId).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("AVAILABLE", updatedBay.getStatus());
    }

    @Test
    @DisplayName("PATCH /api/v1/analytics/work-orders/{id}/status rejects invalid status with 400")
    void testUpdateWorkOrderInvalidStatus() throws Exception {
        UpdateWorkOrderStatusRequest request = new UpdateWorkOrderStatusRequest("INVALID_STATUS", "Invalid");

        mockMvc.perform(patch("/api/v1/analytics/work-orders/" + workOrderId + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success", is(false)))
            .andExpect(jsonPath("$.error", containsString("Invalid work order status")));
    }

    @Test
    @DisplayName("Scenario 2: GET /api/v1/analytics/accounting-csv streams RFC 4180 CSV with Content-Disposition")
    void testStreamedAccountingCsvExport() throws Exception {
        MvcResult mvcResult = mockMvc.perform(get("/api/v1/analytics/accounting-csv")
                .param("period", "annual"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", containsString("attachment; filename=\"swift_revenue_report_")))
            .andExpect(header().string("Content-Type", containsString("text/csv")))
            .andReturn();

        // Trigger asynchronous dispatch for StreamingResponseBody
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch(mvcResult))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %")))
            .andExpect(content().string(containsString("Total,")));
    }
}
