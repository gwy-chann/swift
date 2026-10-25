package com.swift.modules.analytics;

import com.swift.modules.analytics.service.CsvExportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class CsvStreamingMemoryBenchmarkTests {

    @Autowired
    private CsvExportService csvExportService;

    @Test
    @DisplayName("Scenario 2: Stream 100,000+ CSV rows without unbounded JVM heap buffering or OOM")
    void test100kRowsMemoryStability() throws Exception {
        int rowCount = 100_000;
        StreamingResponseBody responseBody = csvExportService.streamBenchmarkRows(rowCount);

        System.gc();
        long initialHeap = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        AtomicLong bytesWritten = new AtomicLong(0);

        // Discarding output stream counting bytes
        OutputStream countingStream = new OutputStream() {
            @Override
            public void write(int b) {
                bytesWritten.incrementAndGet();
            }

            @Override
            public void write(byte[] b, int off, int len) {
                bytesWritten.addAndGet(len);
            }
        };

        // Stream the 100,000 rows
        responseBody.writeTo(countingStream);

        long finalHeap = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long heapDifference = Math.max(0, finalHeap - initialHeap);

        // Verify bytes written is non-trivial (100,000 rows should be several megabytes)
        assertTrue(bytesWritten.get() > 3_000_000, "Expected >3MB of CSV data streamed, was " + bytesWritten.get());

        // Verify heap difference did not spike uncontrollably (< 64MB buffer limit)
        long heapDiffMb = heapDifference / (1024 * 1024);
        assertTrue(heapDiffMb < 64, "Heap memory spiked by " + heapDiffMb + "MB during 100,000 row stream");
    }
}
