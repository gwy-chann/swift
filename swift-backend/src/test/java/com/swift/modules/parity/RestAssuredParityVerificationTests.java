package com.swift.modules.parity;

import io.restassured.module.mockmvc.RestAssuredMockMvc;
import com.swift.modules.analytics.model.ServiceBay;
import com.swift.modules.analytics.model.WorkOrder;
import com.swift.modules.analytics.repository.ServiceBayRepository;
import com.swift.modules.analytics.repository.WorkOrderRepository;
import com.swift.modules.catalog.model.Product;
import com.swift.modules.catalog.repository.ProductRepository;
import com.swift.modules.motomatcher.model.MotorcycleModel;
import com.swift.modules.motomatcher.repository.MotorcycleModelRepository;
import com.swift.modules.pricing.model.PricingRules;
import com.swift.modules.pricing.repository.PricingRulesRepository;
import com.swift.modules.services.model.LaborServiceEntity;
import com.swift.modules.services.repository.LaborServiceRepository;
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
import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.*;

/**
 * SIAA-98: Automated Parity Assertion Suite for Phase 6 Cutover
 * Validates contract, schema, and payload parity across all migrated REST endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin@swiftparts.com", roles = {"ADMIN"})
public class RestAssuredParityVerificationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MotorcycleModelRepository motorcycleModelRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PricingRulesRepository pricingRulesRepository;

    @Autowired
    private LaborServiceRepository laborServiceRepository;

    @Autowired
    private ServiceBayRepository serviceBayRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(mockMvc);

        // Seed MotoMatcher if empty
        if (motorcycleModelRepository.count() == 0) {
            motorcycleModelRepository.save(new MotorcycleModel(
                UUID.randomUUID(), "Yamaha", "NMAX 155", 155, 2020, 2024, "Maxi Scooter", "/images/nmax.jpg"
            ));
        }

        // Seed Product Catalog if empty
        if (productRepository.count() == 0) {
            productRepository.save(new Product(
                null, "ENG-OIL-10W40", "Yamalube 4T 10W-40 Synthetic", "4909449452004",
                "Oils", "Yamalube", new BigDecimal("250.00"), new BigDecimal("295.00"),
                new BigDecimal("337.50"), 20, 5, "A-01", true
            ));
        }

        // Seed Pricing Rules if empty
        if (pricingRulesRepository.count() == 0) {
            pricingRulesRepository.save(new PricingRules(
                1L, new BigDecimal("35.00"), new BigDecimal("18.00"),
                new BigDecimal("40.00"), new BigDecimal("450.00"), null, null
            ));
        }

        // Seed Labor Services if empty
        if (laborServiceRepository.count() == 0) {
            laborServiceRepository.save(new LaborServiceEntity(
                UUID.randomUUID(), "SRV-OIL", "Standard Oil Change", "Bay 1",
                new BigDecimal("150.00"), "30 mins", "General Maintenance", true,
                OffsetDateTime.now(), OffsetDateTime.now()
            ));
        }

        // Seed Service Bay and Work Order if empty
        if (serviceBayRepository.count() == 0) {
            ServiceBay bay = serviceBayRepository.save(new ServiceBay(
                null, "Bay #1 - Express", "Express", "OCCUPIED", 1
            ));
            workOrderRepository.save(new WorkOrder(
                null, "WO-PARITY-001", bay.getId(), "Yamaha Aerox 155", "Full CVT Cleaning", "IN PROGRESS"
            ));
        }
    }

    @Test
    @DisplayName("Parity: 1. MotoMatcher Vehicle Fitment & Compatibility Endpoints")
    void testMotoMatcherParity() {
        // Models list
        given()
            .when()
            .get("/api/v1/motomatcher/models")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("size()", greaterThanOrEqualTo(1))
            .body("[0].model", notNullValue());

        // Compatibility Matrix
        given()
            .when()
            .get("/api/v1/motomatcher/matrix")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("oem_parts", notNullValue())
            .body("aftermarket_parts", notNullValue());
    }

    @Test
    @DisplayName("Parity: 2. Master Product Catalog & Barcode Price Check Endpoints")
    void testCatalogParity() {
        // Price check barcode
        given()
            .param("query", "ENG-OIL-10W40")
            .when()
            .get("/api/v1/inventory/pricecheck")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("success", is(true))
            .body("product", notNullValue());

        // Catalog search
        given()
            .param("query", "oil")
            .when()
            .get("/api/v1/admin/products")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("success", is(true))
            .body("products", notNullValue());
    }

    @Test
    @DisplayName("Parity: 3. Inventory Stock Adjustments & Audit Logs")
    void testInventoryParity() {
        // Stock adjustment logs
        given()
            .when()
            .get("/api/v1/inventory/stock-adjust/logs")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("logs", notNullValue());

        // Stock adjustment export CSV
        given()
            .when()
            .get("/api/v1/inventory/stock-adjust/export-csv")
            .then()
            .statusCode(200)
            .header("Content-Type", containsString("text/csv"));
    }

    @Test
    @DisplayName("Parity: 4. Pricing Markup Rules")
    void testPricingParity() {
        // Pricing rules
        given()
            .when()
            .get("/api/v1/pricing/rules")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("retailMarkup", notNullValue())
            .body("wholesaleMarkup", notNullValue())
            .body("hourlyLaborRate", notNullValue());
    }

    @Test
    @DisplayName("Parity: 5. Workshop Bay Labor Rates")
    void testWorkshopLaborParity() {
        // Labor services list
        given()
            .when()
            .get("/api/v1/services/labor")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("size()", greaterThanOrEqualTo(1))
            .body("[0].name", notNullValue())
            .body("[0].rate", notNullValue());
    }

    @Test
    @DisplayName("Parity: 6. Staff Shift Attendance & Timesheet History")
    void testShiftAttendanceParity() {
        // Staff attendance history
        given()
            .when()
            .get("/api/v1/staff/attendance-history")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("shifts", notNullValue());

        // Active shift check for random staff UUID
        given()
            .when()
            .get("/api/v1/shifts/active/" + UUID.randomUUID())
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("hasActiveShift", notNullValue());
    }

    @Test
    @DisplayName("Parity: 7. POS Checkout Transactions & Cart Services")
    void testPosCheckoutParity() {
        // Transactions history
        given()
            .when()
            .get("/api/v1/pos/transactions")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("size()", greaterThanOrEqualTo(0));

        // Active workshop services for POS cart
        given()
            .when()
            .get("/api/v1/pos/services")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("size()", greaterThanOrEqualTo(1));
    }

    @Test
    @DisplayName("Parity: 8. Executive Analytics Dashboard & Non-Blocking Streamed CSV")
    void testAnalyticsParity() {
        // Aggregated Dashboard KPIs
        given()
            .when()
            .get("/api/v1/analytics/kpis")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("kpis", notNullValue())
            .body("revenueTrend", notNullValue())
            .body("categoryPnl", notNullValue())
            .body("serviceBays", hasSize(greaterThanOrEqualTo(1)));

        // 7-day revenue trend
        given()
            .when()
            .get("/api/v1/analytics/revenue-trend")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("days", hasSize(7));

        // Category P&L
        given()
            .param("period", "weekly")
            .when()
            .get("/api/v1/analytics/category-pnl")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("categories", notNullValue())
            .body("summary", notNullValue());

        // Service bay queue
        given()
            .when()
            .get("/api/v1/analytics/service-bays")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE)
            .body("size()", greaterThanOrEqualTo(1));

        // Streamed CSV export
        given()
            .param("period", "monthly")
            .when()
            .get("/api/v1/analytics/accounting-csv")
            .then()
            .statusCode(200)
            .header("Content-Type", containsString("text/csv"))
            .header("Content-Disposition", containsString("attachment"));
    }

    @Test
    @DisplayName("Parity: 9. User Administration & Security Forensic Audit")
    void testUserAdminAndAuditParity() {
        // List staff users
        given()
            .when()
            .get("/api/v1/admin/users")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE);

        // Security forensic audit logs
        given()
            .when()
            .get("/api/v1/admin/audit/security")
            .then()
            .statusCode(200)
            .contentType(MediaType.APPLICATION_JSON_VALUE);
    }

    @Test
    @DisplayName("Parity: 10. Spring Boot Actuator Telemetry & Health Probe")
    void testActuatorPrometheusParity() {
        // Health probe
        given()
            .when()
            .get("/actuator/health")
            .then()
            .statusCode(200)
            .body("status", is("UP"));

        // Metrics probe
        given()
            .when()
            .get("/actuator/metrics")
            .then()
            .statusCode(200)
            .body("names", hasItem("http.server.requests"));
    }
}
