package com.swift.modules.admin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class SelfLockoutException extends RuntimeException {
    public SelfLockoutException(String message) {
        super(message);
    }
}
