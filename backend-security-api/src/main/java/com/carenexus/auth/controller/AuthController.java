package com.carenexus.auth.controller;

import com.carenexus.auth.dto.LoginRequest;
import com.carenexus.auth.dto.AuthResponse;
import com.carenexus.auth.dto.RefreshTokenRequest;
import com.carenexus.auth.dto.UserInfoResponse;
import com.carenexus.auth.model.User;
import com.carenexus.auth.repository.UserRepository;
import com.carenexus.auth.security.JwtService;
import com.carenexus.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    /** 🔹 Register a new user */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody User user) {
        AuthResponse response = authService.register(user);
        return ResponseEntity.ok(response);
    }

    /** 🔹 Login & return tokens */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(response);
    }

    /** 🔹 Refresh access token */
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    /** 🔒 Protected test endpoint */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Protected endpoint accessed!");
    }

    /** 🔒 Get currently authenticated user info */
    @GetMapping("/me")
    public ResponseEntity<UserInfoResponse> getCurrentUser(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }

        String email = principal.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoResponse response = UserInfoResponse.builder()
                .id(user.getId())
                .referenceNumber(user.getReferenceNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getMobilePhone())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

    /** 🔒 Update current user profile */
    @PutMapping("/me")
    public ResponseEntity<UserInfoResponse> updateCurrentUser(Principal principal, @RequestBody User updateRequest) {
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }

        String email = principal.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update fields (excluding email, password, and referenceNumber for security)
        if (updateRequest.getFirstName() != null) {
            user.setFirstName(updateRequest.getFirstName());
        }
        if (updateRequest.getLastName() != null) {
            user.setLastName(updateRequest.getLastName());
        }
        if (updateRequest.getMobilePhone() != null) {
            user.setMobilePhone(updateRequest.getMobilePhone());
        }

        User updatedUser = userRepository.save(user);

        UserInfoResponse response = UserInfoResponse.builder()
                .id(updatedUser.getId())
                .referenceNumber(updatedUser.getReferenceNumber())
                .firstName(updatedUser.getFirstName())
                .lastName(updatedUser.getLastName())
                .email(updatedUser.getEmail())
                .phone(updatedUser.getMobilePhone())
                .role(updatedUser.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

    /** 🔹 Get all users (paginated) */
    @GetMapping("/users")
    public ResponseEntity<Page<UserInfoResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<User> users = userRepository.findAll();
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, users.size());
        List<User> paginatedUsers = users.subList(start, end);

        List<UserInfoResponse> responses = paginatedUsers.stream()
                .map(user -> UserInfoResponse.builder()
                        .id(user.getId())
                        .referenceNumber(user.getReferenceNumber())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .email(user.getEmail())
                        .phone(user.getMobilePhone())
                        .role(user.getRole())
                        .build())
                .toList();

        Page<UserInfoResponse> result = new PageImpl<>(responses, pageable, users.size());
        return ResponseEntity.ok(result);
    }

    /** 🔹 Get user by ID */
    @GetMapping("/users/{id}")
    public ResponseEntity<UserInfoResponse> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoResponse response = UserInfoResponse.builder()
                .id(user.getId())
                .referenceNumber(user.getReferenceNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getMobilePhone())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

    /** 🔹 Get all patients (paginated) */
    @GetMapping("/patients")
    public ResponseEntity<Page<UserInfoResponse>> getAllPatients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<User> patients = userRepository.findByRole("PATIENT");
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, patients.size());
        List<User> paginatedPatients = patients.subList(start, end);

        List<UserInfoResponse> responses = paginatedPatients.stream()
                .map(user -> UserInfoResponse.builder()
                        .id(user.getId())
                        .referenceNumber(user.getReferenceNumber())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .email(user.getEmail())
                        .phone(user.getMobilePhone())
                        .role(user.getRole())
                        .build())
                .toList();

        Page<UserInfoResponse> result = new PageImpl<>(responses, pageable, patients.size());
        return ResponseEntity.ok(result);
    }

    /** 🔹 Get patient by ID */
    @GetMapping("/patients/{id}")
    public ResponseEntity<UserInfoResponse> getPatientById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"PATIENT".equals(user.getRole())) {
            throw new RuntimeException("User is not a patient");
        }

        UserInfoResponse response = UserInfoResponse.builder()
                .id(user.getId())
                .referenceNumber(user.getReferenceNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getMobilePhone())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

    /** 🔹 Get all doctors (paginated) */
    @GetMapping("/doctors")
    public ResponseEntity<Page<UserInfoResponse>> getAllDoctors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<User> doctors = userRepository.findByRole("DOCTOR");
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<User> paginatedDoctors = doctors.subList(start, end);

        List<UserInfoResponse> responses = paginatedDoctors.stream()
                .map(user -> UserInfoResponse.builder()
                        .id(user.getId())
                        .referenceNumber(user.getReferenceNumber())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .email(user.getEmail())
                        .phone(user.getMobilePhone())
                        .role(user.getRole())
                        .build())
                .toList();

        Page<UserInfoResponse> result = new PageImpl<>(responses, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }

    /** 🔹 Get user by email */
    @GetMapping("/users/email/{email}")
    public ResponseEntity<UserInfoResponse> getUserByEmail(@PathVariable String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoResponse response = UserInfoResponse.builder()
                .id(user.getId())
                .referenceNumber(user.getReferenceNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getMobilePhone())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

    /** 🔹 Get all users by role (paginated) */
    @GetMapping("/users/by-role")
    public ResponseEntity<Page<UserInfoResponse>> getUsersByRole(
            @RequestParam String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(page, size);
        List<User> users = userRepository.findByRole(role);

        int start = page * size;
        int end = Math.min(start + size, users.size());
        List<User> paginatedUsers = users.subList(start, end);

        List<UserInfoResponse> responses = paginatedUsers.stream()
                .map(user -> UserInfoResponse.builder()
                        .id(user.getId())
                        .referenceNumber(user.getReferenceNumber())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .email(user.getEmail())
                        .phone(user.getMobilePhone())
                        .role(user.getRole())
                        .build())
                .toList();

        Page<UserInfoResponse> result = new PageImpl<>(responses, pageable, users.size());
        return ResponseEntity.ok(result);
    }

    /** 🔹 Get user by reference number */
    @GetMapping("/users/reference/{referenceNumber}")
    public ResponseEntity<UserInfoResponse> getUserByReference(@PathVariable String referenceNumber) {
        User user = userRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoResponse response = UserInfoResponse.builder()
                .id(user.getId())
                .referenceNumber(user.getReferenceNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getMobilePhone())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(response);
    }

}