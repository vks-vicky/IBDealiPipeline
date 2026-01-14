package org.example.ibpipeline.service;

import org.apache.coyote.BadRequestException;
import org.example.ibpipeline.exception.ResourceNotFoundException;
import org.example.ibpipeline.model.Role;
import org.example.ibpipeline.model.User;
import org.example.ibpipeline.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /* Create a new user (ADMIN only) */
    public User createUser(String username, String email, String rawPassword, Role role) throws BadRequestException {

        if(userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username already exists");
        }

        if(userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setActive(true);

        return userRepository.save(user);
    }

    /* Activate & Deactivate a user */
    public User updateUserStatus(String userId, boolean active) {
        User user = getUserById(userId);
        user.setActive(active);
        return userRepository.save(user);
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User Not Found"));
    }

    /* Fetch by username*/
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User Not Found"));
    }

    /* List all users (ADMIN only) */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }


}
