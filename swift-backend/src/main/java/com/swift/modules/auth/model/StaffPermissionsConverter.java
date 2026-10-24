package com.swift.modules.auth.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class StaffPermissionsConverter implements AttributeConverter<StaffPermissions, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(StaffPermissions attribute) {
        if (attribute == null) {
            return "{}";
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return "{}";
        }
    }

    @Override
    public StaffPermissions convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return new StaffPermissions();
        }
        try {
            String clean = dbData.trim();
            if (clean.startsWith("\"") && clean.endsWith("\"")) {
                clean = MAPPER.readValue(clean, String.class);
            }
            return MAPPER.readValue(clean, StaffPermissions.class);
        } catch (Exception e) {
            return new StaffPermissions();
        }
    }
}
