package com.swift.modules.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.catalog.dto.CreateProductRequest;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductCatalogControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 1: Registering a new product with automated markup calculation and physical locator")
    void shouldRegisterProductWithAutomatedMarkupAndLocator() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
            "ENG-OIL-10W40",
            "Yamalube 4T 10W-40 Synthetic",
            "Oils",
            "Yamalube",
            "Universal",
            new BigDecimal("250.00"),
            null, // wholesale calculated (+18%)
            null, // retail calculated (+35% OEM)
            20,
            5,
            "A-01",
            "03",
            null,
            null,
            true, // OEM
            "https://example.com/oil.png",
            "Premium motorcycle engine oil"
        );

        mockMvc.perform(post("/api/v1/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sku", is("ENG-OIL-10W40")))
                .andExpect(jsonPath("$.name", is("Yamalube 4T 10W-40 Synthetic")))
                .andExpect(jsonPath("$.category", is("Oils")))
                .andExpect(jsonPath("$.cost", is(250.00)))
                .andExpect(jsonPath("$.wholesale", is(295.00)))
                .andExpect(jsonPath("$.retail", is(337.50)))
                .andExpect(jsonPath("$.rack_id", is("A-01")))
                .andExpect(jsonPath("$.shelf_id", is("03")))
                .andExpect(jsonPath("$.location", is("Rack A-01 / Shelf 03")))
                .andExpect(jsonPath("$.oem", is(true)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 2: Enforce unique SKU constraint returning HTTP 409 Conflict")
    void shouldEnforceUniqueSkuConstraint() throws Exception {
        // Pre-insert product with SKU ENG-OIL-10W40
        Product existing = new Product();
        existing.setSku("ENG-OIL-10W40");
        existing.setName("Existing Oil");
        existing.setCategory("Oils");
        existing.setBrand("Yamalube");
        existing.setCost(new BigDecimal("250.00"));
        existing.setWholesale(new BigDecimal("295.00"));
        existing.setRetail(new BigDecimal("337.50"));
        productRepository.save(existing);

        // Attempt to register another product with same SKU (case-insensitive)
        CreateProductRequest duplicateRequest = new CreateProductRequest(
            "eng-oil-10w40",
            "Duplicate Oil Registration",
            "Oils",
            "Yamalube",
            "Universal",
            new BigDecimal("250.00"),
            null,
            null,
            10,
            5,
            "A-01",
            "03",
            null,
            null,
            true,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.code", is("SKU_ALREADY_EXISTS")))
                .andExpect(jsonPath("$.error", containsString("ENG-OIL-10W40")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 3: Browse master product catalog with search and category filtering")
    void shouldBrowseMasterProductCatalog() throws Exception {
        Product p1 = new Product();
        p1.setSku("ENG-OIL-10W40");
        p1.setName("Yamalube 4T 10W-40 Synthetic");
        p1.setCategory("Oils");
        p1.setBrand("Yamalube");
        p1.setCost(new BigDecimal("250.00"));
        p1.setWholesale(new BigDecimal("295.00"));
        p1.setRetail(new BigDecimal("337.50"));
        p1.setRackId("A-01");
        p1.setShelfId("03");
        p1.setLocation("Rack A-01 / Shelf 03");
        productRepository.save(p1);

        Product p2 = new Product();
        p2.setSku("BRK-PAD-NMAX");
        p2.setName("NMAX Front Brake Pads");
        p2.setCategory("Brakes");
        p2.setBrand("Nissin");
        p2.setCost(new BigDecimal("180.00"));
        p2.setWholesale(new BigDecimal("212.40"));
        p2.setRetail(new BigDecimal("252.00"));
        p2.setRackId("B-02");
        p2.setShelfId("01");
        p2.setLocation("Rack B-02 / Shelf 01");
        productRepository.save(p2);

        // 1. Fetch all
        mockMvc.perform(get("/api/v1/admin/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.totalCount", is(2)))
                .andExpect(jsonPath("$.products", hasSize(2)));

        // 2. Filter by category
        mockMvc.perform(get("/api/v1/admin/products").param("category", "Oils"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount", is(1)))
                .andExpect(jsonPath("$.products[0].sku", is("ENG-OIL-10W40")));

        // 3. Search query
        mockMvc.perform(get("/api/v1/admin/products").param("query", "NMAX"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount", is(1)))
                .andExpect(jsonPath("$.products[0].sku", is("BRK-PAD-NMAX")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Scenario 4: Validation errors return HTTP 400 Bad Request with field errors")
    void shouldReturnBadRequestOnValidationFailure() throws Exception {
        CreateProductRequest invalidRequest = new CreateProductRequest(
            "", // blank SKU
            "", // blank name
            "", // blank category
            "", // blank brand
            null,
            new BigDecimal("-10.00"), // negative cost
            null,
            null,
            -5, // negative stock
            0,  // threshold < 1
            null,
            null,
            null,
            null,
            false,
            null,
            null
        );

        mockMvc.perform(post("/api/v1/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.fieldErrors.sku", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.name", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.cost", notNullValue()));
    }
}
