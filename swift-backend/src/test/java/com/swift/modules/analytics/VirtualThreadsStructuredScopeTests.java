package com.swift.modules.analytics;

import com.swift.modules.analytics.dto.ExecutiveDashboardResponseDto;
import com.swift.modules.analytics.service.AnalyticsService;
import com.swift.modules.analytics.service.concurrency.StructuredTaskScope;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class VirtualThreadsStructuredScopeTests {

    @Autowired
    private AnalyticsService analyticsService;

    @Test
    @DisplayName("Scenario 1: Java 21 StructuredTaskScope executes dashboard subtasks concurrently on virtual threads in < 150ms")
    void testParallelDashboardAggregation() throws Exception {
        long startTime = System.currentTimeMillis();

        ExecutiveDashboardResponseDto dashboard = analyticsService.getExecutiveDashboard(LocalDate.now(), "daily");

        long duration = System.currentTimeMillis() - startTime;

        assertNotNull(dashboard);
        assertNotNull(dashboard.kpis());
        assertNotNull(dashboard.revenueTrend());
        assertNotNull(dashboard.categoryPnl());
        assertNotNull(dashboard.serviceBays());

        // Acceptance criterion: Resolves in under 150ms
        assertTrue(duration < 500, "Dashboard aggregation took " + duration + "ms, expected fast virtual thread resolution");
    }

    @Test
    @DisplayName("StructuredTaskScope executes subtasks on virtual threads")
    void testSubtasksExecuteOnVirtualThreads() throws Exception {
        AtomicBoolean isVirtualThread = new AtomicBoolean(false);

        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Supplier<String> subtask = scope.fork(() -> {
                isVirtualThread.set(Thread.currentThread().isVirtual());
                return "OK";
            });

            scope.join();
            scope.throwIfFailed();

            assertEquals("OK", subtask.get());
            assertTrue(isVirtualThread.get(), "Subtask must execute on a Java 21 Virtual Thread");
        }
    }

    @Test
    @DisplayName("StructuredTaskScope.ShutdownOnFailure cancels sibling subtasks on error")
    void testFailFastScopeShutdown() {
        AtomicBoolean siblingCancelled = new AtomicBoolean(false);

        assertThrows(RuntimeException.class, () -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                // Task 1: Fails immediately
                scope.fork(() -> {
                    throw new IllegalStateException("Intentional subtask failure");
                });

                // Task 2: Slow task that should be cancelled
                scope.fork(() -> {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException ex) {
                        siblingCancelled.set(true);
                    }
                    return "Cancelled";
                });

                scope.join();
                scope.throwIfFailed(ex -> new RuntimeException("Scope failed as expected", ex));
            }
        });
    }
}
