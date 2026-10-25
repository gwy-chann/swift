package com.swift.modules.analytics.service.impl;

import com.swift.modules.analytics.dto.CategoryPnlDto;
import com.swift.modules.analytics.dto.CategoryPnlItemDto;
import com.swift.modules.analytics.dto.CategoryPnlSummaryDto;
import com.swift.modules.analytics.service.AnalyticsService;
import com.swift.modules.analytics.service.CsvExportService;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.BufferedWriter;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class CsvExportServiceImpl implements CsvExportService {

    private final AnalyticsService analyticsService;
    private static final String CRLF = "\r\n";

    public CsvExportServiceImpl(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @Override
    public StreamingResponseBody exportAccountingCsv(String period, LocalDate startDate, LocalDate endDate) {
        return outputStream -> {
            try {
                writeCsvToStream(period, startDate, endDate, outputStream);
            } catch (java.io.IOException ioe) {
                throw ioe;
            } catch (Exception ex) {
                throw new java.io.IOException("Failed to write CSV stream: " + ex.getMessage(), ex);
            }
        };
    }

    @Override
    public StreamingResponseBody streamBenchmarkRows(int rowCount) {
        return outputStream -> {
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8), 16384)) {
                writer.write("Row Number,Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %");
                writer.write(CRLF);

                for (int i = 1; i <= rowCount; i++) {
                    writer.write(String.valueOf(i));
                    writer.write(",Benchmark Item ");
                    writer.write(String.valueOf(i));
                    writer.write(",1,100.00,60.00,40.00,40.0%");
                    writer.write(CRLF);

                    if (i % 2000 == 0) {
                        writer.flush();
                    }
                }
                writer.flush();
            }
        };
    }

    @Override
    public String generateFilename(LocalDate date) {
        LocalDate d = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        return "swift_revenue_report_" + d + ".csv";
    }

    @Override
    public void writeCsvToStream(String period, LocalDate startDate, LocalDate endDate, OutputStream outputStream) throws java.io.IOException {
        CategoryPnlDto pnlData = analyticsService.getCategoryPnl(period, startDate, endDate);

        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8), 8192)) {
            // Header row
            writer.write("Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %");
            writer.write(CRLF);

            if (pnlData.categories() != null) {
                for (CategoryPnlItemDto item : pnlData.categories()) {
                    String marginStr = item.marginPct() != null ? String.format("%.1f%%", item.marginPct()) : "0.0%";
                    writer.write(sanitizeCsvCell(item.category()));
                    writer.write(",");
                    writer.write(String.valueOf(item.unitsSold() != null ? item.unitsSold() : 0));
                    writer.write(",");
                    writer.write(sanitizeNumber(item.grossRevenue()));
                    writer.write(",");
                    writer.write(sanitizeNumber(item.cogs()));
                    writer.write(",");
                    writer.write(sanitizeNumber(item.netProfit()));
                    writer.write(",");
                    writer.write(marginStr);
                    writer.write(CRLF);
                }
            }

            // Summary footer row
            CategoryPnlSummaryDto summary = pnlData.summary() != null ? pnlData.summary() : CategoryPnlSummaryDto.empty();
            String overallMarginStr = summary.overallMarginPct() != null ? String.format("%.1f%%", summary.overallMarginPct()) : "0.0%";

            writer.write("Total,");
            writer.write(String.valueOf(summary.totalUnitsSold() != null ? summary.totalUnitsSold() : 0));
            writer.write(",");
            writer.write(sanitizeNumber(summary.totalGrossRevenue()));
            writer.write(",");
            writer.write(sanitizeNumber(summary.totalCogs()));
            writer.write(",");
            writer.write(sanitizeNumber(summary.totalNetProfit()));
            writer.write(",");
            writer.write(overallMarginStr);
            writer.write(CRLF);

            writer.flush();
        }
    }

    private String sanitizeNumber(BigDecimal amount) {
        if (amount == null) {
            return "0.00";
        }
        return amount.setScale(2, java.math.RoundingMode.HALF_UP).toString();
    }

    private String sanitizeCsvCell(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
