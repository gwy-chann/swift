package com.swift.modules.shift.exception;

public class ShiftNotActiveException extends RuntimeException {
    public ShiftNotActiveException(String message) {
        super(message);
    }
}
