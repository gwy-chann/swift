package com.swift.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3.0 (Swagger) Specification Configuration.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI swiftOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("SWIFT Motorcycle Parts & POS Modular Monolith API")
                .description("Production REST API ecosystem migrating from Next.js App Router (Strangler Fig Pattern)")
                .version("v1.0.0")
                .contact(new Contact()
                    .name("SWIFT Platform Engineering")
                    .email("dev@swiftparts.local"))
                .license(new License()
                    .name("Proprietary")
                    .url("https://swiftparts.local")));
    }
}
