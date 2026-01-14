package org.example.ibpipeline.service;

import org.example.ibpipeline.dto.LoginRequest;
import org.example.ibpipeline.dto.LoginResponse;
import org.example.ibpipeline.dto.RefreshTokenRequest;
import org.example.ibpipeline.exception.BadRequestException;
import org.example.ibpipeline.model.Role;
import org.example.ibpipeline.model.User;
import org.example.ibpipeline.repository.UserRepository;
import org.example.ibpipeline.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private User activeUser;
    private User inactiveUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        activeUser = new User();
        activeUser.setId("1");
        activeUser.setUsername("john");
        activeUser.setPassword("hashed");
        activeUser.setRole(Role.USER);
        activeUser.setActive(true);

        inactiveUser = new User();
        inactiveUser.setId("2");
        inactiveUser.setUsername("mark");
        inactiveUser.setPassword("hashed2");
        inactiveUser.setRole(Role.USER);
        inactiveUser.setActive(false);
    }

    @Test
    void login_success() {
        LoginRequest request = new LoginRequest();
        request.setUsername("john");
        request.setPassword("pass");

        when(userRepository.findByUsername("john"))
                .thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("pass", "hashed"))
                .thenReturn(true);
        when(jwtUtil.generateAccessToken(activeUser))
                .thenReturn("access");
        when(jwtUtil.generateRefreshToken(activeUser))
                .thenReturn("refresh");

        LoginResponse response = authService.login(request);

        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals("USER", response.getRole());
    }

    @Test
    void login_userInactive() {
        LoginRequest request = new LoginRequest();
        request.setUsername("mark");
        request.setPassword("pass");

        when(userRepository.findByUsername("mark"))
                .thenReturn(Optional.of(inactiveUser));

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> authService.login(request)
        );

        assertEquals("User account is inactive", ex.getMessage());
    }

    @Test
    void login_wrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setUsername("john");
        request.setPassword("wrong");

        when(userRepository.findByUsername("john"))
                .thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "hashed"))
                .thenReturn(false);

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> authService.login(request)
        );

        assertEquals("Invalid username or password", ex.getMessage());
    }

    @Test
    void refresh_invalidToken() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("bad");

        when(jwtUtil.validateRefreshToken("bad"))
                .thenReturn(false);

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> authService.refreshAccessToken(request)
        );

        assertEquals("Invalid refresh token", ex.getMessage());
    }

    @Test
    void refresh_success() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("good");

        when(jwtUtil.validateRefreshToken("good"))
                .thenReturn(true);
        when(jwtUtil.extractUsername("good"))
                .thenReturn("john");
        when(userRepository.findByUsername("john"))
                .thenReturn(Optional.of(activeUser));
        when(jwtUtil.generateAccessToken(activeUser))
                .thenReturn("newAccess");

        String token = authService.refreshAccessToken(request);

        assertEquals("newAccess", token);
    }

    @Test
    void refresh_userInactive() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("good");

        when(jwtUtil.validateRefreshToken("good"))
                .thenReturn(true);
        when(jwtUtil.extractUsername("good"))
                .thenReturn("mark");
        when(userRepository.findByUsername("mark"))
                .thenReturn(Optional.of(inactiveUser));

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> authService.refreshAccessToken(request)
        );

        assertEquals("User account is inactive", ex.getMessage());
    }
}
