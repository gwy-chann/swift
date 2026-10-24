package com.swift;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * SWIFT Modular Monolith Backend Application.
 * <p>
 * Entry point for the enterprise Spring Boot 3.3 backend executing on Java 21 LTS
 * with Project Loom Virtual Thread support.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class SwiftBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SwiftBackendApplication.class, args);
    }
}
