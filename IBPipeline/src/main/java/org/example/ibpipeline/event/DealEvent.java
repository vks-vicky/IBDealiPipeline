package org.example.ibpipeline.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DealEvent {
    private String eventId;
    private DealEventType eventType;
    private String dealId;
    private String dealTitle;
    private String userId;
    private String details;
    private Instant timestamp;
}
