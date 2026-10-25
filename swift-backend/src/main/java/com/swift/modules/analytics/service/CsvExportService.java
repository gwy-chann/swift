package com.swift.modules.analytics.service;

import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStream;
import java.time.LocalDate;

public interface CsvExportService {

    StreamingResponseBody exportAccountingCsv(String period, LocalDate startDate, LocalDate endDate);

    StreamingResponseBody streamBenchmarkRows(int rowCount);

    String generateFilename(LocalDate date);

    void writeCsvToStream(String period, LocalDate startDate, LocalDate endDate, OutputStream outputStream) throws java.io.IOException;
}
