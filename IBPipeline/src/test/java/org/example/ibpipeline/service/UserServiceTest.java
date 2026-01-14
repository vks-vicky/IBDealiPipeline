package org.example.ibpipeline.service;

import org.apache.coyote.BadRequestException;
import org.example.ibpipeline.exception.ResourceNotFoundException;
import org.example.ibpipeline.model.Role;
import org.example.ibpipeline.model.User;
import org.example.ibpipeline.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        user = new User();
        user.setId("1");
        user.setUsername("john");
        user.setEmail("john@bank.com");
        user.setPassword("hashed");
        user.setRole(Role.USER);
        user.setActive(true);
    }

    @Test
    void createUser_success() throws Exception {
        when(userRepository.existsByUsername("john")).thenReturn(false);
        when(userRepository.existsByEmail("john@bank.com")).thenReturn(false);
        when(passwordEncoder.encode("pass")).thenReturn("hashed");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        User created = userService.createUser(
                "john", "john@bank.com", "pass", Role.USER);

        assertEquals("john", created.getUsername());
        assertEquals("john@bank.com", created.getEmail());
        assertEquals("hashed", created.getPassword());
        assertEquals(Role.USER, created.getRole());
        assertTrue(created.isActive());
    }

    @Test
    void createUser_usernameExists() {
        when(userRepository.existsByUsername("john")).thenReturn(true);

        assertThrows(BadRequestException.class, () ->
                userService.createUser("john", "john@bank.com", "pass", Role.USER)
        );
    }

    @Test
    void createUser_emailExists() {
        when(userRepository.existsByUsername("john")).thenReturn(false);
        when(userRepository.existsByEmail("john@bank.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () ->
                userService.createUser("john", "john@bank.com", "pass", Role.USER)
        );
    }

    @Test
    void updateUserStatus_success() {
        when(userRepository.findById("1")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        User updated = userService.updateUserStatus("1", false);

        assertFalse(updated.isActive());
    }

    @Test
    void updateUserStatus_notFound() {
        when(userRepository.findById("1")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                userService.updateUserStatus("1", false)
        );
    }

    @Test
    void getUserById_success() {
        when(userRepository.findById("1")).thenReturn(Optional.of(user));

        User found = userService.getUserById("1");

        assertEquals("john", found.getUsername());
    }

    @Test
    void getUserById_notFound() {
        when(userRepository.findById("1")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                userService.getUserById("1")
        );
    }

    @Test
    void getUserByUsername_success() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(user));

        User found = userService.getUserByUsername("john");

        assertEquals("john@bank.com", found.getEmail());
    }

    @Test
    void getUserByUsername_notFound() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                userService.getUserByUsername("john")
        );
    }

    @Test
    void getAllUsers_returnsList() {
        when(userRepository.findAll()).thenReturn(List.of(user));

        List<User> users = userService.getAllUsers();

        assertEquals(1, users.size());
        assertEquals("john", users.get(0).getUsername());
    }
}
