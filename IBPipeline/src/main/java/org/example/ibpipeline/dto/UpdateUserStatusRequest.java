package org.example.ibpipeline.dto;

public class UpdateUserStatusRequest {

    private boolean active;

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}