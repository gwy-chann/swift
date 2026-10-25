package com.swift.modules.shift.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring JDBC wrapper executing native PostgreSQL PL/pgSQL stored procedures:
 * - public.clock_in_shift(p_terminal_id, p_notes, p_profile_id)
 * - public.clock_out_shift(p_shift_id, p_notes, p_profile_id)
 * - public.toggle_shift_break(p_shift_id, p_profile_id)
 */
@Component
public class ShiftStoredProcedureWrapper {

    private static final Logger log = LoggerFactory.getLogger(ShiftStoredProcedureWrapper.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ShiftStoredProcedureWrapper(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<JsonNode> callClockInShift(String terminalId, String notes, UUID profileId) {
        try {
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.clock_in_shift(?::text, ?::text, ?::uuid)::text",
                String.class,
                terminalId,
                notes,
                profileId
            );
            if (jsonResult != null) {
                return Optional.of(objectMapper.readTree(jsonResult));
            }
        } catch (Exception ex) {
            log.debug("Native clock_in_shift stored procedure call failed: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    public Optional<JsonNode> callClockOutShift(UUID shiftId, String notes, UUID profileId) {
        try {
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.clock_out_shift(?::uuid, ?::text, ?::uuid)::text",
                String.class,
                shiftId,
                notes,
                profileId
            );
            if (jsonResult != null) {
                return Optional.of(objectMapper.readTree(jsonResult));
            }
        } catch (Exception ex) {
            log.debug("Native clock_out_shift stored procedure call failed: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    public Optional<JsonNode> callToggleShiftBreak(UUID shiftId, UUID profileId) {
        try {
            String jsonResult = jdbcTemplate.queryForObject(
                "SELECT public.toggle_shift_break(?::uuid, ?::uuid)::text",
                String.class,
                shiftId,
                profileId
            );
            if (jsonResult != null) {
                return Optional.of(objectMapper.readTree(jsonResult));
            }
        } catch (Exception ex) {
            log.debug("Native toggle_shift_break stored procedure call failed: {}", ex.getMessage());
        }
        return Optional.empty();
    }
}
