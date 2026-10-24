package com.swift.modules.catalog;

import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductPriceCheckControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();

        // 1. YAM-NMAX-BL01: Cost 280, Retail 450, Wholesale 380
        // Markup: ((450 - 280) / 280) * 100 = 60.7%
        // Wholesale Markup: ((380 - 280) / 280) * 100 = 35.7%
        // SC/PWD: 450 * 0.8 = 360.0
        Product brakeLever = new Product(
                null,
                "YAM-NMAX-BL01",
                "Brake Lever Left (OEM)",
                "Brakes",
                "Yamaha Genuine Parts",
                "Yamaha NMAX 155",
                BigDecimal.valueOf(280.00),
                BigDecimal.valueOf(380.00),
                BigDecimal.valueOf(450.00),
                8,
                3,
                "Rack A-01 / Shelf 2",
                true
        );
        productRepository.save(brakeLever);

        // 2. HON-CLK-CVTB: Cost 520, Retail 850, Wholesale 720
        // Markup: ((850 - 520) / 520) * 100 = 63.5%
        // SC/PWD: 850 * 0.8 = 680.0
        Product driveBelt = new Product(
                null,
                "HON-CLK-CVTB",
                "Bando Power Grip CVT Belt",
                "Drivetrain",
                "Bando",
                "Honda Click 125i/150i",
                BigDecimal.valueOf(520.00),
                BigDecimal.valueOf(720.00),
                BigDecimal.valueOf(850.00),
                5,
                2,
                "Rack B-04 / Shelf 1",
                false
        );
        productRepository.save(driveBelt);
    }

    @Test
    @DisplayName("GET /api/v1/inventory/pricecheck calculates dual-tier prices, markup %, and shelf location for exact SKU")
    void priceCheckExactSkuSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/pricecheck")
                        .param("query", "YAM-NMAX-BL01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.product.sku", is("YAM-NMAX-BL01")))
                .andExpect(jsonPath("$.product.name", is("Brake Lever Left (OEM)")))
                .andExpect(jsonPath("$.product.cost", is(280.0)))
                .andExpect(jsonPath("$.product.retailPrice", is(450.0)))
                .andExpect(jsonPath("$.product.wholesalePrice", is(380.0)))
                .andExpect(jsonPath("$.product.scPwdPrice", is(360.0)))
                .andExpect(jsonPath("$.product.grossMarkupPercent", is(60.7)))
                .andExpect(jsonPath("$.product.wholesaleMarkupPercent", is(35.7)))
                .andExpect(jsonPath("$.product.location", is("Rack A-01 / Shelf 2")));
    }

    @Test
    @DisplayName("GET /api/v1/inventory/pricecheck matches product by partial name")
    void priceCheckPartialNameSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/pricecheck")
                        .param("query", "CVT Belt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.product.sku", is("HON-CLK-CVTB")))
                .andExpect(jsonPath("$.product.cost", is(520.0)))
                .andExpect(jsonPath("$.product.retailPrice", is(850.0)))
                .andExpect(jsonPath("$.product.scPwdPrice", is(680.0)))
                .andExpect(jsonPath("$.product.grossMarkupPercent", is(63.5)))
                .andExpect(jsonPath("$.product.location", is("Rack B-04 / Shelf 1")));
    }

    @Test
    @DisplayName("GET /api/v1/inventory/pricecheck returns 404 with PRODUCT_NOT_FOUND for unknown query")
    void priceCheckNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/pricecheck")
                        .param("query", "UNKNOWN-CODE-999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.code", is("PRODUCT_NOT_FOUND")))
                .andExpect(jsonPath("$.error", is("No item found for barcode / code: \"UNKNOWN-CODE-999\".")));
    }

    @Test
    @DisplayName("GET /api/v1/inventory/pricecheck returns 400 with INVALID_QUERY for blank query")
    void priceCheckBlankQuery() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/pricecheck")
                        .param("query", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.code", is("INVALID_QUERY")))
                .andExpect(jsonPath("$.error", is("Product search query cannot be empty.")));
    }
}
