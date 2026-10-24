package com.swift.modules.inventory.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.dto.*;
import com.swift.modules.inventory.exception.InsufficientStockException;
import com.swift.modules.inventory.exception.InvalidAdjustmentException;
import com.swift.modules.inventory.exception.ProductNotFoundException;
import com.swift.modules.inventory.model.StockAdjustmentLog;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import com.swift.modules.inventory.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import javax.sql.DataSource;
import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InventoryServiceImpl implements InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryServiceImpl.class);

    private final ProductRepository productRepository;
    private final StockAdjustmentLogRepository stockAdjustmentLogRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DataSource dataSource;

    public InventoryServiceImpl(
            ProductRepository productRepository,
            StockAdjustmentLogRepository stockAdjustmentLogRepository,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            DataSource dataSource
    ) {
        this.productRepository = productRepository;
        this.stockAdjustmentLogRepository = stockAdjustmentLogRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.dataSource = dataSource;
    }

    @Override
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public StockAdjustmentResponse adjustProductStock(StockAdjustmentRequest request) {
        if (request.quantityDelta() == null || request.quantityDelta() == 0) {
            throw new InvalidAdjustmentException("Adjustment delta cannot be zero.", "ZERO_DELTA_NOT_ALLOWED");
        }

        // Try calling PostgreSQL stored procedure public.adjust_product_stock via SimpleJdbcCall
        try {
            SimpleJdbcCall jdbcCall = new SimpleJdbcCall(dataSource)
                    .withFunctionName("adjust_product_stock");

            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("p_sku", request.sku())
                    .addValue("p_type", request.adjustmentType() != null ? request.adjustmentType() : "Stock Adjustment")
                    .addValue("p_delta", request.quantityDelta())
                    .addValue("p_reason", request.reason() != null ? request.reason() : "")
                    .addValue("p_user_name", request.userName() != null ? request.userName() : "Staff Member");

            Object result = jdbcCall.executeFunction(Object.class, params);
            if (result != null) {
                Map<?, ?> resultMap;
                if (result instanceof Map<?, ?> map) {
                    resultMap = map;
                } else if (result instanceof String str) {
                    resultMap = objectMapper.readValue(str, Map.class);
                } else {
                    resultMap = objectMapper.convertValue(result, Map.class);
                }

                int prevStock = ((Number) resultMap.get("previous_stock")).intValue();
                int newStock = ((Number) resultMap.get("new_stock")).intValue();
                String logId = resultMap.get("log_id") != null ? resultMap.get("log_id").toString() : UUID.randomUUID().toString();
                String adjustmentType = request.adjustmentType() != null ? request.adjustmentType() : "Stock Adjustment";
                String user = request.userName() != null ? request.userName() : "Staff Member";

                return StockAdjustmentResponse.success(
                        request.sku(),
                        prevStock,
                        newStock,
                        request.quantityDelta(),
                        adjustmentType,
                        logId,
                        user
                );
            }
        } catch (DataAccessException dae) {
            String msg = dae.getMessage();
            if (msg != null && msg.contains("INSUFFICIENT_STOCK")) {
                Product product = productRepository.findBySkuIgnoreCase(request.sku()).orElse(null);
                int currentStock = product != null ? product.getStock() : 0;
                throw new InsufficientStockException(request.sku(), currentStock, request.quantityDelta());
            }
            if (msg != null && msg.contains("PRODUCT_NOT_FOUND")) {
                throw new ProductNotFoundException(request.sku());
            }
            log.info("Stored procedure adjust_product_stock not available or unsupported, falling back to pessimistic locking: {}", dae.getMessage());
        } catch (Exception e) {
            log.info("SimpleJdbcCall execution fallback to JPA transaction: {}", e.getMessage());
        }

        // Atomic JPA fallback with PESSIMISTIC_WRITE row-level locking
        return executePessimisticStockAdjustment(request);
    }

    private StockAdjustmentResponse executePessimisticStockAdjustment(StockAdjustmentRequest request) {
        Product product = productRepository.findWithPessimisticLockBySku(request.sku())
                .orElseThrow(() -> new ProductNotFoundException(request.sku()));

        int currentStock = product.getStock() != null ? product.getStock() : 0;
        int newStock = currentStock + request.quantityDelta();

        if (newStock < 0) {
            throw new InsufficientStockException(request.sku(), currentStock, request.quantityDelta());
        }

        product.setStock(newStock);
        product.setUpdatedAt(OffsetDateTime.now());
        productRepository.save(product);

        String adjustmentType = request.adjustmentType() != null && !request.adjustmentType().isBlank()
                ? request.adjustmentType()
                : "Stock Adjustment";
        String userName = request.userName() != null && !request.userName().isBlank()
                ? request.userName()
                : "Staff Member";

        StockAdjustmentLog auditLog = new StockAdjustmentLog(
                null,
                product.getSku(),
                adjustmentType,
                request.quantityDelta(),
                currentStock,
                newStock,
                request.reason(),
                null,
                userName,
                OffsetDateTime.now()
        );
        StockAdjustmentLog savedLog = stockAdjustmentLogRepository.save(auditLog);

        return StockAdjustmentResponse.success(
                product.getSku(),
                currentStock,
                newStock,
                request.quantityDelta(),
                adjustmentType,
                savedLog.getId().toString(),
                userName
        );
    }

    @Override
    @Transactional(readOnly = true)
    public StockAuditLogsResponse getStockAdjustmentLogs(
            String sku,
            String adjustmentType,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            String search,
            Pageable pageable
    ) {
        Page<StockAdjustmentLog> page = stockAdjustmentLogRepository.findWithFilters(
                sku,
                adjustmentType,
                startDate,
                endDate,
                search,
                pageable
        );

        List<StockAdjustmentLog> allMatching = stockAdjustmentLogRepository.findForExport(
                sku,
                adjustmentType,
                startDate,
                endDate
        );

        int netDelta = 0;
        int totalShrinkage = 0;
        int totalIntake = 0;

        for (StockAdjustmentLog entry : allMatching) {
            int delta = entry.getQuantityDelta() != null ? entry.getQuantityDelta() : 0;
            netDelta += delta;
            if (delta < 0) {
                totalShrinkage += Math.abs(delta);
            } else {
                totalIntake += delta;
            }
        }

        StockAuditSummaryMetricsDto metrics = new StockAuditSummaryMetricsDto(
                allMatching.size(),
                netDelta,
                totalShrinkage,
                totalIntake
        );

        List<StockAuditLogDto> dtos = page.getContent().stream()
                .map(StockAuditLogDto::fromEntity)
                .toList();

        return StockAuditLogsResponse.success(dtos, metrics, page.getTotalElements());
    }

    @Override
    public StreamingResponseBody exportStockAdjustmentLogsCsv(
            String sku,
            String adjustmentType,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {
        return outputStream -> {
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8))) {
                // RFC 4180 CSV Header
                writer.write("ID,SKU,Adjustment Type,Quantity Delta,Previous Stock,New Stock,Reason,User Name,Created At\n");

                List<StockAdjustmentLog> logs = stockAdjustmentLogRepository.findForExport(
                        sku,
                        adjustmentType,
                        startDate,
                        endDate
                );

                int counter = 0;
                for (StockAdjustmentLog logEntry : logs) {
                    writer.write(String.format(
                            "\"%s\",\"%s\",\"%s\",%d,%d,%d,\"%s\",\"%s\",\"%s\"\n",
                            escapeCsv(logEntry.getId() != null ? logEntry.getId().toString() : ""),
                            escapeCsv(logEntry.getSku()),
                            escapeCsv(logEntry.getAdjustmentType()),
                            logEntry.getQuantityDelta(),
                            logEntry.getPreviousStock(),
                            logEntry.getNewStock(),
                            escapeCsv(logEntry.getReason() != null ? logEntry.getReason() : ""),
                            escapeCsv(logEntry.getUserName() != null ? logEntry.getUserName() : "Staff Member"),
                            logEntry.getCreatedAt() != null ? logEntry.getCreatedAt().toString() : ""
                    ));
                    counter++;
                    if (counter % 100 == 0) {
                        writer.flush();
                    }
                }
                writer.flush();
            }
        };
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}
