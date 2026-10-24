package com.swift.modules.inventory;

import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.dto.StockAdjustmentRequest;
import com.swift.modules.inventory.model.StockAdjustmentLog;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import com.swift.modules.inventory.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class InventoryConcurrencyTests {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockAdjustmentLogRepository logRepository;

    @BeforeEach
    void setUp() {
        logRepository.deleteAll();
        productRepository.deleteAll();

        Product product = new Product();
        product.setSku("BRK-PAD-001");
        product.setName("Brembo Ceramic Brake Pads");
        product.setCategory("Brakes");
        product.setBrand("Brembo");
        product.setCost(new BigDecimal("1200.00"));
        product.setWholesale(new BigDecimal("1416.00"));
        product.setRetail(new BigDecimal("1680.00"));
        product.setStock(50);
        product.setMinThreshold(10);
        productRepository.save(product);
    }

    @Test
    @DisplayName("Scenario 2: Concurrent stock adjustments serialization with 0 lost updates")
    void shouldSerializeConcurrentStockAdjustmentsWithoutLostUpdates() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        // 5 threads will deduct 2 units (-2 * 5 = -10)
        // 5 threads will add 3 units (+3 * 5 = +15)
        // Net delta: +5 units
        // Initial stock: 50 -> Final stock: 55
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    int delta = (index % 2 == 0) ? -2 : 3;
                    String type = (index % 2 == 0) ? "Damaged" : "Restock";
                    StockAdjustmentRequest req = new StockAdjustmentRequest(
                            "BRK-PAD-001",
                            delta,
                            type,
                            "Concurrent Thread #" + index,
                            "Operator " + index
                    );
                    int maxRetries = 5;
                    for (int attempt = 0; attempt < maxRetries; attempt++) {
                        try {
                            inventoryService.adjustProductStock(req);
                            break;
                        } catch (Exception ex) {
                            if (attempt == maxRetries - 1) {
                                ex.printStackTrace();
                            } else {
                                Thread.sleep(25 + (index * 15));
                            }
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Fire all threads simultaneously
        startLatch.countDown();
        boolean completed = finishLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(true, completed, "All concurrent adjustments should complete within timeout");

        // Verify product in database: exactly 50 - 10 + 15 = 55
        Product updatedProduct = productRepository.findBySkuIgnoreCase("BRK-PAD-001").orElseThrow();
        assertEquals(55, updatedProduct.getStock(), "Final product stock must reflect all concurrent deltas with 0 lost updates");

        // Verify that exactly 10 immutable audit records exist
        List<StockAdjustmentLog> logs = logRepository.findBySkuOrderByCreatedAtDesc("BRK-PAD-001");
        assertEquals(10, logs.size(), "All 10 adjustment operations must have distinct audit ledger entries");
    }
}
