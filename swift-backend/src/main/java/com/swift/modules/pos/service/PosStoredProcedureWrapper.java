package com.swift.modules.pos.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Spring JDBC wrapper executing native PostgreSQL PL/pgSQL stored procedure:
 * public.process_pos_checkout(p_transaction JSONB, p_items JSONB)
 */
@Component
public class PosStoredProcedureWrapper {

    private static final Logger log = LoggerFactory.getLogger(PosStoredProcedureWrapper.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PosStoredProcedureWrapper(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<JsonNode> callProcessPosCheckout(String transactionJson, String itemsJson) {
        try {
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.process_pos_checkout(?::jsonb, ?::jsonb)::text",
                String.class,
                transactionJson,
                itemsJson
            );
            if (jsonResult != null) {
                return Optional.of(objectMapper.readTree(jsonResult));
            }
        } catch (Exception ex) {
            log.debug("Native process_pos_checkout stored procedure call failed: {}", ex.getMessage());
            // Rethrow if insufficient stock or product not found error from stored procedure
            String msg = ex.getMessage();
            if (msg != null && (msg.contains("INSUFFICIENT_STOCK") || msg.contains("PRODUCT_NOT_FOUND"))) {
                throw new RuntimeException(msg, ex);
            }
        }
        return Optional.empty();
    }
}
