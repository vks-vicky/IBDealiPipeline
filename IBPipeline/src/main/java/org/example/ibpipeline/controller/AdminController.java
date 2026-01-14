package org.example.ibpipeline.controller;


import jakarta.validation.Valid;
import org.apache.coyote.BadRequestException;
import org.example.ibpipeline.common.ApiResponse;
import org.example.ibpipeline.dto.CreateUserRequest;
import org.example.ibpipeline.dto.UpdateUserStatusRequest;
import org.example.ibpipeline.model.Role;
import org.example.ibpipeline.model.User;
import org.example.ibpipeline.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    /* CREATE USER */
    @PostMapping
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request) throws BadRequestException {

        Role role = Role.valueOf(request.getRole().toUpperCase());

        User user = userService.createUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                role
        );

        return ResponseEntity.ok(user);
    }


    /* ACTIVATE & DEACTIVATE USER */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse> updateStatus(
            @PathVariable String id,
            @RequestBody UpdateUserStatusRequest request) {

        userService.updateUserStatus(id, request.isActive());

        ApiResponse response = new ApiResponse(
                true,
                "User status updated",
                Instant.now()
        );

        return ResponseEntity.ok(response);
    }

    /* ADMIN: List all users */
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    /* USER / ADMIN: Get own profile */
    @GetMapping("/me")
    public User getMyProfile(Authentication authentication) {
        String username = authentication.getName();
        return userService.getUserByUsername(username);
    }
}