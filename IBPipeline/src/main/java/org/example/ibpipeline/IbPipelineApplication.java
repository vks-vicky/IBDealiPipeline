package org.example.ibpipeline;


import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IbPipelineApplication {

    public static void main(String[] args) {
        SpringApplication.run(IbPipelineApplication.class, args);
    }


}
