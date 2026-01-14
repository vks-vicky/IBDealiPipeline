package org.example.ibpipeline.controller;

import jakarta.validation.Valid;
import org.example.ibpipeline.common.ApiResponse;
import org.example.ibpipeline.dto.LoginRequest;
import org.example.ibpipeline.dto.LoginResponse;
import org.example.ibpipeline.dto.RefreshTokenRequest;
import org.example.ibpipeline.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }


    /* LOGIN */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /* REFRESH TOKEN */

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        String newAccessToken = authService.refreshAccessToken(request);

        ApiResponse response = new ApiResponse(
                true,
                newAccessToken,
                Instant.now()
        );

        return ResponseEntity.ok(response);
    }
}
