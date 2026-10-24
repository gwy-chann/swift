package com.swift.modules.services.exception;

public class DuplicateServiceCodeException extends RuntimeException {

    private final String code;

    public DuplicateServiceCodeException(String code) {
        super("Labor service with code \"" + code + "\" already exists.");
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
