package com.carenexus.auth.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableMethodSecurity   // 🔥 enables @PreAuthorize, @PostAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:4200", "http://localhost:8084", "http://localhost:8085", "http://localhost:8086", "http://127.0.0.1:3000", "http://127.0.0.1:4200", "http://127.0.0.1:8084", "http://127.0.0.1:8085", "http://127.0.0.1:8086"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Auth endpoints open (register, login, refresh-token)
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh-token").permitAll()
                        // Public user directory endpoints
                        .requestMatchers("/api/auth/users", "/api/auth/users/**", "/api/auth/patients", "/api/auth/patients/**", "/api/auth/doctors", "/api/auth/doctors/**", "/api/auth/users/by-role").permitAll()
                        // Patient, Doctor, and User Information endpoints
                        .requestMatchers("/api/patient-doctor/**", "/api/user-information/**").permitAll()
                        // Health checks for Docker container orchestration
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // Everything else must be authenticated
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}