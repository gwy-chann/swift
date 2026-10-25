package com.swift.modules.pos;

import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import com.swift.modules.pos.dto.PosCheckoutItemDto;
import com.swift.modules.pos.dto.PosCheckoutRequest;
import com.swift.modules.pos.dto.PosCheckoutResponse;
import com.swift.modules.pos.exception.InsufficientStockException;
import com.swift.modules.pos.repository.TransactionItemRepository;
import com.swift.modules.pos.repository.TransactionRepository;
import com.swift.modules.pos.service.PosCheckoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class PosConcurrencyTests {

    @Autowired
    private PosCheckoutService posCheckoutService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionItemRepository transactionItemRepository;

    @Autowired
    private StockAdjustmentLogRepository stockAdjustmentLogRepository;

    private static final String CONCURRENT_SKU = "PART-SPARK-PLUG";

    @BeforeEach
    void setUp() {
        transactionItemRepository.deleteAll();
        transactionRepository.deleteAll();
        stockAdjustmentLogRepository.deleteAll();
        productRepository.deleteAll();

        // Seed product with exactly 50 units in stock
        Product product = new Product();
        product.setSku(CONCURRENT_SKU);
        product.setName("NGK Iridium Spark Plug CR9EIX");
        product.setCategory("Ignition & Electrical");
        product.setBrand("NGK");
        product.setCost(new BigDecimal("300.00"));
        product.setWholesale(new BigDecimal("360.00"));
        product.setRetail(new BigDecimal("420.00"));
        product.setStock(50);
        product.setMinThreshold(5);
        productRepository.save(product);
    }

    @Test
    @DisplayName("Scenario 5: 50 concurrent cashiers checking out simultaneously without deadlocks or overselling")
    void shouldHandle50ConcurrentCashiersWithoutDeadlocksOrOverselling() throws Exception {
        int cashierCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(cashierCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(cashierCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < cashierCount; i++) {
            final int cashierIndex = i;
            executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all cashiers to fire at the exact same millisecond

                    PosCheckoutRequest request = new PosCheckoutRequest(
                        "REC-STRESS-" + cashierIndex,
                        UUID.randomUUID(),
                        "Cashier #" + cashierIndex,
                        "retail",
                        new BigDecimal("420.00"),
                        null,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        new BigDecimal("420.00"),
                        new BigDecimal("500.00"),
                        new BigDecimal("80.00"),
                        "Cash",
                        List.of(
                            new PosCheckoutItemDto(
                                "part",
                                CONCURRENT_SKU,
                                "NGK Iridium Spark Plug",
                                new BigDecimal("420.00"),
                                1,
                                new BigDecimal("420.00"),
                                "B-03",
                                null
                            )
                        )
                    );

                    // Execute checkout with retry for concurrency lock contention if necessary
                    int maxRetries = 10;
                    for (int attempt = 0; attempt < maxRetries; attempt++) {
                        try {
                            PosCheckoutResponse response = posCheckoutService.processCheckout(request);
                            if (response.success()) {
                                successCount.incrementAndGet();
                                break;
                            }
                        } catch (Exception ex) {
                            if (attempt == maxRetries - 1) {
                                failureCount.incrementAndGet();
                            } else {
                                Thread.sleep(20 + (cashierIndex * 5));
                            }
                        }
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Trigger simultaneous checkout flood
        startLatch.countDown();
        boolean completed = finishLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "Expected all 50 concurrent checkouts to complete within 30 seconds");
        assertEquals(50, successCount.get(), "Expected exactly 50 successful checkouts");
        assertEquals(0, failureCount.get(), "Expected 0 checkout failures or deadlocks");

        // Verify physical stock dropped to exactly 0 (zero overselling)
        Product finalProduct = productRepository.findBySkuIgnoreCase(CONCURRENT_SKU).orElseThrow();
        assertEquals(0, finalProduct.getStock(), "Stock must drop to exactly 0 with zero overselling");

        // Verify 51st checkout fails with InsufficientStockException
        PosCheckoutRequest extraRequest = new PosCheckoutRequest(
            "REC-STRESS-51",
            UUID.randomUUID(),
            "Cashier #51",
            "retail",
            new BigDecimal("420.00"),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("420.00"),
            new BigDecimal("500.00"),
            new BigDecimal("80.00"),
            "Cash",
            List.of(
                new PosCheckoutItemDto(
                    "part",
                    CONCURRENT_SKU,
                    "NGK Iridium Spark Plug",
                    new BigDecimal("420.00"),
                    1,
                    new BigDecimal("420.00"),
                    "B-03",
                    null
                )
            )
        );

        assertThrows(InsufficientStockException.class, () -> {
            posCheckoutService.processCheckout(extraRequest);
        }, "51st checkout must be rejected when stock is 0");
    }
}
