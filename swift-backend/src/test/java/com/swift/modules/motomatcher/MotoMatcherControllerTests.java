package com.swift.modules.motomatcher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.config.CacheConfig;
import com.swift.modules.motomatcher.dto.AddFitmentRuleRequest;
import com.swift.modules.motomatcher.model.MotorcycleModel;
import com.swift.modules.motomatcher.model.ProductFitment;
import com.swift.modules.motomatcher.repository.MotorcycleModelRepository;
import com.swift.modules.motomatcher.repository.ProductFitmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MotoMatcherControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MotorcycleModelRepository motorcycleModelRepository;

    @Autowired
    private ProductFitmentRepository productFitmentRepository;

    @Autowired
    private CacheManager cacheManager;

    private UUID nmaxId;
    private UUID aeroxId;

    @BeforeEach
    void setUp() {
        productFitmentRepository.deleteAll();
        motorcycleModelRepository.deleteAll();
        Objects.requireNonNull(cacheManager.getCache(CacheConfig.CACHE_MOTORCYCLE_MODELS)).clear();

        MotorcycleModel nmax = new MotorcycleModel(
                null,
                "Yamaha",
                "NMAX 155",
                155,
                2020,
                2024,
                "Scooter",
                "/images/motorcycles/yamaha-nmax-155.webp"
        );
        nmax = motorcycleModelRepository.save(nmax);
        nmaxId = nmax.getId();

        MotorcycleModel aerox = new MotorcycleModel(
                null,
                "Yamaha",
                "Aerox 155",
                155,
                2021,
                null,
                "Scooter",
                "/images/motorcycles/yamaha-aerox-155.webp"
        );
        aerox = motorcycleModelRepository.save(aerox);
        aeroxId = aerox.getId();
    }

    @Test
    @DisplayName("GET /api/v1/motomatcher/models returns models list and caches in Caffeine")
    void getModelsReturnsListAndCaches() throws Exception {
        // First call: populates cache
        mockMvc.perform(get("/api/v1/motomatcher/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].make").value("Yamaha"))
                .andExpect(jsonPath("$[0].model").value("Aerox 155"))
                .andExpect(jsonPath("$[1].make").value("Yamaha"))
                .andExpect(jsonPath("$[1].model").value("NMAX 155"));

        // Verify cache contains "all"
        assertThat(Objects.requireNonNull(cacheManager.getCache(CacheConfig.CACHE_MOTORCYCLE_MODELS)).get("all"))
                .isNotNull();

        // Second call: served from Caffeine cache in <10ms
        long start = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/motomatcher/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
        long duration = System.currentTimeMillis() - start;
        assertThat(duration).isLessThan(50);
    }

    @Test
    @DisplayName("GET /api/v1/motomatcher/matrix with null modelId returns empty matrix")
    void getMatrixNullModelIdReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/motomatcher/matrix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.oem_parts", hasSize(0)))
                .andExpect(jsonPath("$.aftermarket_parts", hasSize(0)));
    }

    @Test
    @DisplayName("POST /api/v1/motomatcher/rules creates fitment rule and evicts Caffeine cache")
    @WithMockUser(roles = "STAFF")
    void addRuleCreatesAndEvictsCache() throws Exception {
        // Pre-populate cache
        mockMvc.perform(get("/api/v1/motomatcher/models"))
                .andExpect(status().isOk());
        assertThat(Objects.requireNonNull(cacheManager.getCache(CacheConfig.CACHE_MOTORCYCLE_MODELS)).get("all"))
                .isNotNull();

        UUID productId = UUID.randomUUID();
        AddFitmentRuleRequest request = new AddFitmentRuleRequest(
                productId,
                nmaxId,
                "aftermarket",
                "2020-2024",
                "Tested fitment on dual-ABS"
        );

        mockMvc.perform(post("/api/v1/motomatcher/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.ruleId").isNotEmpty());

        // Verify cache was evicted
        assertThat(Objects.requireNonNull(cacheManager.getCache(CacheConfig.CACHE_MOTORCYCLE_MODELS)).get("all"))
                .isNull();

        // Verify rule persisted in database
        assertThat(productFitmentRepository.findByModelId(nmaxId)).hasSize(1);
    }
}
