package com.carenexus.auth.service;

import com.carenexus.auth.dto.AuthResponse;
import com.carenexus.auth.model.User;
import com.carenexus.auth.repository.UserRepository;
import com.carenexus.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /** REGISTER */
    public AuthResponse register(User user) {
        log.info("[AuthService] Registering new user: {}", user.getEmail());

        // 🔥 Prevent duplicate accounts
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            log.warn("[AuthService] Registration failed - email already in use: {}", user.getEmail());
            throw new RuntimeException("Email already in use");
        }

        // 🔐 Secure password
        log.debug("[AuthService] Encoding password for user: {}", user.getEmail());
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);
        log.info("[AuthService] ✓ User registered successfully: {} (Role: {})", savedUser.getEmail(), savedUser.getRole());

        // 🔥 Issue tokens
        String accessToken = jwtService.generateToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        log.debug("[AuthService] Registration tokens generated for: {}", savedUser.getEmail());
        return new AuthResponse(accessToken, refreshToken);
    }

    /** LOGIN */
    public AuthResponse login(String email, String password) {
        log.info("[AuthService] Login attempt for user: {}", email);

        try {
            // 🔥 Validate credentials
            log.debug("[AuthService] Validating credentials for: {}", email);
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
            log.info("[AuthService] ✓ Credentials validated for: {}", email);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        log.error("[AuthService] User not found after successful authentication: {}", email);
                        return new RuntimeException("User not found");
                    });

            String accessToken = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);

            log.info("[AuthService] ✓ Login successful for user: {} (Role: {})", user.getEmail(), user.getRole());
            return new AuthResponse(accessToken, refreshToken);
        } catch (Exception e) {
            log.error("[AuthService] ✗ Login failed for user {}: {}", email, e.getMessage());
            throw e;
        }
    }

    /** REFRESH TOKEN */
    public AuthResponse refreshToken(String refreshToken) {
        log.info("[AuthService] Token refresh requested");

        try {
            String email = jwtService.extractUsername(refreshToken);
            log.debug("[AuthService] Extracting user from refresh token: {}", email);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        log.error("[AuthService] User not found for token refresh: {}", email);
                        return new RuntimeException("User not found");
                    });

            if (!jwtService.isValidToken(refreshToken, user)) {
                log.warn("[AuthService] ✗ Invalid refresh token for user: {}", email);
                throw new RuntimeException("Invalid refresh token");
            }

            String newAccessToken = jwtService.generateToken(user);
            log.info("[AuthService] ✓ Token refreshed successfully for user: {}", email);

            return new AuthResponse(newAccessToken, refreshToken);
        } catch (Exception e) {
            log.error("[AuthService] ✗ Token refresh failed: {}", e.getMessage());
            throw e;
        }
    }
}