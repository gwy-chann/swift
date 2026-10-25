package com.swift.modules.pos;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.inventory.repository.StockAdjustmentLogRepository;
import com.swift.modules.pos.dto.PosCheckoutItemDto;
import com.swift.modules.pos.dto.PosCheckoutRequest;
import com.swift.modules.pos.model.Transaction;
import com.swift.modules.pos.repository.TransactionItemRepository;
import com.swift.modules.pos.repository.TransactionRepository;
import com.swift.modules.services.model.LaborServiceEntity;
import com.swift.modules.services.repository.LaborServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PosCheckoutControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionItemRepository transactionItemRepository;

    @Autowired
    private StockAdjustmentLogRepository stockAdjustmentLogRepository;

    @Autowired
    private LaborServiceRepository laborServiceRepository;

    private static final String TEST_SKU = "PART-OIL-10W40";

    @BeforeEach
    void setUp() {
        transactionItemRepository.deleteAll();
        transactionRepository.deleteAll();
        stockAdjustmentLogRepository.deleteAll();
        productRepository.deleteAll();
        laborServiceRepository.deleteAll();

        // Seed product
        Product product = new Product();
        product.setSku(TEST_SKU);
        product.setName("Fully Synthetic 4T Engine Oil 10W-40");
        product.setCategory("Fluids & Lubricants");
        product.setBrand("Motul");
        product.setCost(new BigDecimal("350.00"));
        product.setWholesale(new BigDecimal("400.00"));
        product.setRetail(new BigDecimal("450.00"));
        product.setStock(50);
        product.setMinThreshold(5);
        product.setRackId("R-01");
        product.setShelfId("S-02");
        productRepository.save(product);

        // Seed labor service
        LaborServiceEntity service = new LaborServiceEntity();
        service.setCode("SRV-OIL");
        service.setName("Standard Oil Change");
        service.setBay("Bay #1");
        service.setRate(new BigDecimal("150.00"));
        service.setDuration("15m");
        service.setActive(true);
        laborServiceRepository.save(service);
    }

    @Test
    @DisplayName("Scenario 1: Atomic POS checkout with row-level stock deduction & receipt generation")
    void shouldExecuteAtomicCheckoutSuccessfully() throws Exception {
        PosCheckoutRequest request = new PosCheckoutRequest(
            "REC-20261025-0001",
            UUID.randomUUID(),
            "Elena Rostova",
            "retail",
            new BigDecimal("600.00"),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("600.00"),
            new BigDecimal("1000.00"),
            new BigDecimal("400.00"),
            "Cash",
            List.of(
                new PosCheckoutItemDto(
                    "part",
                    TEST_SKU,
                    "Fully Synthetic 4T Engine Oil 10W-40",
                    new BigDecimal("450.00"),
                    1,
                    new BigDecimal("450.00"),
                    "R-01-S-02",
                    null
                ),
                new PosCheckoutItemDto(
                    "service",
                    "SRV-OIL",
                    "Standard Oil Change",
                    new BigDecimal("150.00"),
                    1,
                    new BigDecimal("150.00"),
                    null,
                    "Bay #1"
                )
            )
        );

        mockMvc.perform(post("/api/v1/pos/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.receiptNumber", is("REC-20261025-0001")))
            .andExpect(jsonPath("$.itemsCount", is(2)))
            .andExpect(jsonPath("$.partsDecremented", is(1)))
            .andExpect(jsonPath("$.totalDue", is(600.00)))
            .andExpect(jsonPath("$.cashTendered", is(1000.00)))
            .andExpect(jsonPath("$.changeDue", is(400.00)));

        // Verify stock decremented from 50 to 49
        Product updatedProduct = productRepository.findBySkuIgnoreCase(TEST_SKU).orElseThrow();
        assertEquals(49, updatedProduct.getStock());

        // Verify transaction saved
        Transaction tx = transactionRepository.findByReceiptNumber("REC-20261025-0001").orElseThrow();
        assertEquals("Elena Rostova", tx.getCashierName());
        assertEquals(new BigDecimal("600.00"), tx.getTotalDue());
    }

    @Test
    @DisplayName("Scenario 2: Cash tender validation and exact change calculation")
    void shouldValidateCashTenderAndRejectUnderpayment() throws Exception {
        // Underpayment test: Total 450.00, Tendered 400.00 -> HTTP 400
        PosCheckoutRequest underpaidRequest = new PosCheckoutRequest(
            null,
            null,
            "Elena Rostova",
            "retail",
            new BigDecimal("450.00"),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("450.00"),
            new BigDecimal("400.00"),
            BigDecimal.ZERO,
            "Cash",
            List.of(
                new PosCheckoutItemDto(
                    "part",
                    TEST_SKU,
                    "Fully Synthetic 4T Engine Oil 10W-40",
                    new BigDecimal("450.00"),
                    1,
                    new BigDecimal("450.00"),
                    null,
                    null
                )
            )
        );

        mockMvc.perform(post("/api/v1/pos/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(underpaidRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("INSUFFICIENT_CASH")))
            .andExpect(jsonPath("$.error", containsString("Insufficient cash tendered")));

        // Exact change test: Bill 450.00, Tendered 500.00 -> Change 50.00
        PosCheckoutRequest validRequest = new PosCheckoutRequest(
            null,
            null,
            "Elena Rostova",
            "retail",
            new BigDecimal("450.00"),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("450.00"),
            new BigDecimal("500.00"),
            new BigDecimal("50.00"),
            "Cash",
            List.of(
                new PosCheckoutItemDto(
                    "part",
                    TEST_SKU,
                    "Fully Synthetic 4T Engine Oil 10W-40",
                    new BigDecimal("450.00"),
                    1,
                    new BigDecimal("450.00"),
                    null,
                    null
                )
            )
        );

        mockMvc.perform(post("/api/v1/pos/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.changeDue", is(50.00)));
    }

    @Test
    @DisplayName("Scenario 3: Thermal receipt payload generation matching physical receipt template")
    void shouldGenerateFormattedThermalReceipt() throws Exception {
        PosCheckoutRequest request = new PosCheckoutRequest(
            "REC-20261024-001",
            UUID.randomUUID(),
            "Cashier Elena",
            "retail",
            new BigDecimal("450.00"),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("450.00"),
            new BigDecimal("500.00"),
            new BigDecimal("50.00"),
            "Cash",
            List.of(
                new PosCheckoutItemDto(
                    "part",
                    TEST_SKU,
                    "Fully Synthetic 4T Engine Oil 10W-40",
                    new BigDecimal("450.00"),
                    1,
                    new BigDecimal("450.00"),
                    "A-01",
                    null
                )
            )
        );

        mockMvc.perform(post("/api/v1/pos/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/pos/receipts/REC-20261024-001/thermal"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receiptNumber", is("REC-20261024-001")))
            .andExpect(jsonPath("$.storeName", is("SWIFT MOTO SERVICE")))
            .andExpect(jsonPath("$.tin", is("TIN: 409-281-992-000")))
            .andExpect(jsonPath("$.warrantyNotice", containsString("Parts warranty valid for 7 days")))
            .andExpect(jsonPath("$.items", hasSize(1)))
            .andExpect(jsonPath("$.escPosBase64", notNullValue()))
            .andExpect(jsonPath("$.escPosPrintable", containsString("SWIFT MOTO SERVICE")));
    }

    @Test
    @DisplayName("Scenario 4: Retrieve transactions and active workshop labor services")
    void shouldRetrieveTransactionsAndLaborServices() throws Exception {
        mockMvc.perform(get("/api/v1/pos/services"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].code", is("SRV-OIL")))
            .andExpect(jsonPath("$[0].bay", is("Bay #1")));

        mockMvc.perform(get("/api/v1/pos/transactions?limit=10"))
            .andExpect(status().isOk());
    }
}
