package com.swift;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class SwiftBackendApplicationTests {

    @Test
    @DisplayName("Verify Spring ApplicationContext loads without error")
    void contextLoads() {
        assertTrue(true, "Application context bootstrapped successfully");
    }
}
