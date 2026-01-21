package org.example.ibpipeline.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    public static final String DEAL_EVENTS_TOPIC = "deal-events";

    @Bean
    public NewTopic dealEventsTopic() {
        return TopicBuilder.name(DEAL_EVENTS_TOPIC)
                .partitions(1)
                .replicas(1)
                .config("min.insync.replicas", "1")
                .build();
    }
}
