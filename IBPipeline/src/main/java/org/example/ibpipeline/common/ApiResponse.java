package org.example.ibpipeline.common;

import java.time.Instant;

public class ApiResponse {
    private boolean success;
    private String message;
    private Instant timestamp;

    public ApiResponse(boolean success, String message, Instant timestamp) {
        this.success = success;
        this.message = message;
        this.timestamp = timestamp;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}

