package org.example.ibpipeline.service;

import org.example.ibpipeline.config.KafkaTopicConfig;
import org.example.ibpipeline.event.DealEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class KafkaProducerService {

    private static final Logger logger = LoggerFactory.getLogger(KafkaProducerService.class);

    private final KafkaTemplate<String, DealEvent> kafkaTemplate;

    public KafkaProducerService(KafkaTemplate<String, DealEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Async
    public void sendDealEvent(DealEvent event) {
        try {
            logger.info("Publishing deal event: {} for deal: {}", event.getEventType(), event.getDealId());
            
            CompletableFuture<SendResult<String, DealEvent>> future = 
                kafkaTemplate.send(KafkaTopicConfig.DEAL_EVENTS_TOPIC, event.getDealId(), event);

            future.whenComplete((result, ex) -> {
                if (ex == null) {
                    logger.info("Successfully published event: {} to partition: {} with offset: {}",
                            event.getEventType(),
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset());
                } else {
                    logger.error("Failed to publish event: {} for deal: {}. Error: {}", 
                            event.getEventType(), event.getDealId(), ex.getMessage());
                }
            });
        } catch (Exception e) {
            logger.error("Exception while publishing Kafka event: {} for deal: {}. Error: {}", 
                    event.getEventType(), event.getDealId(), e.getMessage());
        }
    }
}
