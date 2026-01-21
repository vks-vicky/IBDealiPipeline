package org.example.ibpipeline.service;

import org.example.ibpipeline.config.KafkaTopicConfig;
import org.example.ibpipeline.event.DealEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {

    private static final Logger logger = LoggerFactory.getLogger(KafkaConsumerService.class);

    @KafkaListener(
            topics = KafkaTopicConfig.DEAL_EVENTS_TOPIC,
            groupId = "deal-event-consumer-group",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeDealEvent(
            @Payload DealEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {
        
        logger.info("==============================================");
        logger.info("📨 Consumed Deal Event from Kafka");
        logger.info("Event Type: {}", event.getEventType());
        logger.info("Deal ID: {}", event.getDealId());
        logger.info("Deal Title: {}", event.getDealTitle());
        logger.info("User ID: {}", event.getUserId());
        logger.info("Details: {}", event.getDetails());
        logger.info("Timestamp: {}", event.getTimestamp());
        logger.info("Partition: {} | Offset: {}", partition, offset);
        logger.info("==============================================");

        // Add your business logic here
        // For example: send notifications, update analytics, trigger workflows, etc.
    }
}
