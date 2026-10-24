package com.swift.modules.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.dto.StockAdjustmentRequest;
import com.swift.modules.inventory.model.StockAdjustmentLog;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InventoryStockControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 1: Atomic stock adjustment reduces stock and writes immutable audit record")
    void shouldAdjustProductStockAtomics() throws Exception {
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                "BRK-PAD-001",
                -5,
                "Damaged",
                "Damaged in transit",
                "Inventory Auditor"
        );

        mockMvc.perform(post("/api/v1/inventory/stock-adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.sku", is("BRK-PAD-001")))
                .andExpect(jsonPath("$.previousStock", is(50)))
                .andExpect(jsonPath("$.newStock", is(45)))
                .andExpect(jsonPath("$.quantityDelta", is(-5)))
                .andExpect(jsonPath("$.adjustmentType", is("Damaged")));

        // Verify product in database
        Product updatedProduct = productRepository.findBySkuIgnoreCase("BRK-PAD-001").orElseThrow();
        assertEquals(45, updatedProduct.getStock());

        // Verify audit log record
        List<StockAdjustmentLog> logs = logRepository.findBySkuOrderByCreatedAtDesc("BRK-PAD-001");
        assertEquals(1, logs.size());
        StockAdjustmentLog logEntry = logs.get(0);
        assertEquals(-5, logEntry.getQuantityDelta());
        assertEquals(50, logEntry.getPreviousStock());
        assertEquals(45, logEntry.getNewStock());
        assertEquals("Damaged", logEntry.getAdjustmentType());
        assertEquals("Damaged in transit", logEntry.getReason());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 3: Streamed stock adjustment audit log CSV export via StreamingResponseBody")
    void shouldStreamAuditLogCsvExport() throws Exception {
        // Pre-insert an adjustment log
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                "BRK-PAD-001",
                -2,
                "Shrinkage",
                "Audit Count Discrepancy",
                "Lead Auditor"
        );
        mockMvc.perform(post("/api/v1/inventory/stock-adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        org.springframework.test.web.servlet.MvcResult mvcResult = mockMvc.perform(get("/api/v1/inventory/stock-adjust/export-csv"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", startsWith("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("stock-adjustment-audit-")))
                .andExpect(content().string(containsString("ID,SKU,Adjustment Type,Quantity Delta,Previous Stock,New Stock,Reason,User Name,Created At")))
                .andExpect(content().string(containsString("BRK-PAD-001")))
                .andExpect(content().string(containsString("Shrinkage")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 5: Insufficient stock adjustment is rejected returning HTTP 400 with INSUFFICIENT_STOCK")
    void shouldRejectInsufficientStockAdjustment() throws Exception {
        // Set stock to 5
        Product p = productRepository.findBySkuIgnoreCase("BRK-PAD-001").orElseThrow();
        p.setStock(5);
        productRepository.save(p);

        StockAdjustmentRequest request = new StockAdjustmentRequest(
                "BRK-PAD-001",
                -10, // Requesting -10 when stock is 5
                "Damaged",
                "Cracked packaging",
                "Staff Member"
        );

        mockMvc.perform(post("/api/v1/inventory/stock-adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("INSUFFICIENT_STOCK")));

        // Verify stock untouched
        Product unchanged = productRepository.findBySkuIgnoreCase("BRK-PAD-001").orElseThrow();
        assertEquals(5, unchanged.getStock());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Validation: Zero delta is rejected with ZERO_DELTA_NOT_ALLOWED")
    void shouldRejectZeroDelta() throws Exception {
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                "BRK-PAD-001",
                0,
                "Audit",
                "No change",
                "Staff Member"
        );

        mockMvc.perform(post("/api/v1/inventory/stock-adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("ZERO_DELTA_NOT_ALLOWED")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Validation: Non-existent SKU returns HTTP 404 PRODUCT_NOT_FOUND")
    void shouldReturn404ForNonExistentSku() throws Exception {
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                "NON-EXISTENT-SKU",
                -5,
                "Damaged",
                "Lost item",
                "Staff Member"
        );

        mockMvc.perform(post("/api/v1/inventory/stock-adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("PRODUCT_NOT_FOUND")));
    }
}
