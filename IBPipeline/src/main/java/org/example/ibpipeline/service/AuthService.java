package org.example.ibpipeline.service;

import org.example.ibpipeline.dto.LoginRequest;
import org.example.ibpipeline.dto.LoginResponse;
import org.example.ibpipeline.dto.RefreshTokenRequest;
import org.example.ibpipeline.exception.BadRequestException;
import org.example.ibpipeline.model.User;
import org.example.ibpipeline.repository.UserRepository;
import org.example.ibpipeline.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /* Authenticate User and generate tokens */
    public LoginResponse login(LoginRequest request) {

         User user = userRepository.findByUsername(request.getUsername()).orElseThrow(() -> new BadRequestException("Invalid username or password"));

         if(!user.isActive()) {
             throw new BadRequestException("User account is inactive");
         }

         if(!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
             throw new BadRequestException("Invalid username or password");
         }

         String accessToken = jwtUtil.generateAccessToken(user);
         String refreshToken = jwtUtil.generateRefreshToken(user);

         return new LoginResponse(
                 accessToken,
                 refreshToken,
                 user.getRole().name()
         );
    }

    /* Generate new access token using refresh token */
    public String refreshAccessToken(RefreshTokenRequest request) {

        if(!jwtUtil.validateRefreshToken(request.getRefreshToken())) {
            throw new BadRequestException("Invalid refresh token");
        }

        String username = jwtUtil.extractUsername(request.getRefreshToken());

        User  user = userRepository.findByUsername(username).orElseThrow(() -> new BadRequestException("User not found"));

        if(!user.isActive()) {
            throw new BadRequestException("User account is inactive");
        }

        return jwtUtil.generateAccessToken(user);
    }
}
