package com.carenexus.auth.security;

import com.carenexus.auth.model.User;
import com.carenexus.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();
        log.debug("[JwtAuthenticationFilter] Request: {} {}", request.getMethod(), requestPath);

        String authHeader = request.getHeader("Authorization");
        log.debug("[JwtAuthenticationFilter] Authorization header present: {}", authHeader != null);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("[JwtAuthenticationFilter] No Bearer token found, continuing without authentication");
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authHeader.substring(7);
            log.debug("[JwtAuthenticationFilter] Extracted token: {}...{}",
                    token.substring(0, Math.min(20, token.length())),
                    token.substring(Math.max(0, token.length() - 10)));

            String email = jwtService.extractUsername(token);
            log.info("[JwtAuthenticationFilter] Extracted email from token: {}", email);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug("[JwtAuthenticationFilter] Looking up user with email: {}", email);
                User user = userRepository.findByEmail(email).orElse(null);

                if (user == null) {
                    log.warn("[JwtAuthenticationFilter] User not found in database: {}", email);
                    filterChain.doFilter(request, response);
                    return;
                }

                log.debug("[JwtAuthenticationFilter] User found: {} (Role: {})", user.getEmail(), user.getRole());

                if (jwtService.isValidToken(token, user)) {
                    log.info("[JwtAuthenticationFilter] ✓ Token valid for user: {}", email);

                    // 🔥 Use user's authorities (ROLE_DOCTOR / ROLE_PATIENT / etc)
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    user.getAuthorities()
                            );

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("[JwtAuthenticationFilter] ✓ Authentication set in SecurityContext for: {}", email);
                } else {
                    log.warn("[JwtAuthenticationFilter] ✗ Token invalid for user: {}", email);
                }
            } else {
                log.debug("[JwtAuthenticationFilter] Email is null or authentication already set");
            }
        } catch (Exception e) {
            log.error("[JwtAuthenticationFilter] ✗ Error processing JWT token: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }
}