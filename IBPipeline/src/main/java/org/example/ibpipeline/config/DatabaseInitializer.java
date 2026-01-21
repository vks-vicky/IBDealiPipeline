package org.example.ibpipeline.config;

import org.example.ibpipeline.model.User;
import org.example.ibpipeline.model.Role;
import org.example.ibpipeline.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

@Configuration
public class DatabaseInitializer {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Check if admin user already exists
            if (userRepository.findByUsername("admin").isEmpty()) {
                logger.info("Creating default admin user...");
                
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@ibpipeline.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(Role.ADMIN);
                admin.setActive(true);
                
                userRepository.save(admin);
                logger.info("Default admin user created successfully with username: admin and password: admin123");
            } else {
                logger.info("Admin user already exists, skipping initialization");
            }
        };
    }
}
