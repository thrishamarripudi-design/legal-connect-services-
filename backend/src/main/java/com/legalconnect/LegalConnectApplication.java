package com.legalconnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LegalConnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(LegalConnectApplication.class, args);
    }
}
