package com.swift.modules.inventory.service;

import com.swift.modules.inventory.dto.StockAdjustmentRequest;
import com.swift.modules.inventory.dto.StockAdjustmentResponse;
import com.swift.modules.inventory.dto.StockAuditLogsResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.OffsetDateTime;

public interface InventoryService {

    StockAdjustmentResponse adjustProductStock(StockAdjustmentRequest request);

    StockAuditLogsResponse getStockAdjustmentLogs(
            String sku,
            String adjustmentType,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            String search,
            Pageable pageable
    );

    StreamingResponseBody exportStockAdjustmentLogsCsv(
            String sku,
            String adjustmentType,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    );
}
