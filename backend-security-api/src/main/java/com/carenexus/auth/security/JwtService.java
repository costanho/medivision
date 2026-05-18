package com.carenexus.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    // Read from environment/properties with fallback
    @Value("${jwt.secret:U29tZVN1cGVyU2VjdXJlSldUU2VjcmV0S2V5MTIzNCE=}")
    private String secretKey;

    @Value("${jwt.access-expiration:86400000}")  // 24 hours default
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration:604800000}")  // 7 days default
    private long refreshExpiration;

    /* ------------------ CLAIM EXTRACTION ------------------ */

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        final Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }

    /* ------------------ TOKEN GENERATION ------------------ */

    /** Access Token = valid 24 hours */
    public String generateToken(UserDetails userDetails) {
        log.info("[JwtService] Generating access token for user: {}", userDetails.getUsername());
        String token = buildToken(new HashMap<>(), userDetails, jwtExpiration);
        log.debug("[JwtService] Access token generated: {}...{}", token.substring(0, 20), token.substring(token.length() - 10));
        return token;
    }

    /** Refresh Token = valid 7 days */
    public String generateRefreshToken(UserDetails userDetails) {
        log.info("[JwtService] Generating refresh token for user: {}", userDetails.getUsername());
        String token = buildToken(new HashMap<>(), userDetails, refreshExpiration);
        log.debug("[JwtService] Refresh token generated: {}...{}", token.substring(0, 20), token.substring(token.length() - 10));
        return token;
    }

    private String buildToken(Map<String, Object> extraClaims,
                              UserDetails userDetails,
                              long expirationMs) {

        String token = Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername()) // email
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();

        log.debug("[JwtService] Token built successfully");
        return token;
    }

    /* ------------------ TOKEN VALIDATION ------------------ */

    /** NEW: This is required by JwtAuthenticationFilter */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        return isValidToken(token, userDetails);
    }

    public boolean isValidToken(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            boolean isValid = username.equals(userDetails.getUsername()) && !isTokenExpired(token);
            log.debug("[JwtService] Token validation for {}: {}", username, isValid ? "VALID" : "INVALID");
            return isValid;
        } catch (ExpiredJwtException e) {
            log.warn("[JwtService] Token has expired");
            return false;
        } catch (JwtException e) {
            log.warn("[JwtService] Invalid token: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("[JwtService] Error validating token: {}", e.getMessage());
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        try {
            Date exp = extractClaim(token, Claims::getExpiration);
            return exp.before(new Date());
        } catch (ExpiredJwtException e) {
            return true;  // Token is definitely expired
        }
    }

    /* ------------------ INTERNAL HELPERS ------------------ */

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .setSigningKey(getSignInKey())
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        try {
            byte[] bytes = Decoders.BASE64.decode(secretKey);
            log.debug("[JwtService] Sign-in key created successfully (length: {})", bytes.length);
            return Keys.hmacShaKeyFor(bytes);
        } catch (Exception e) {
            log.error("[JwtService] Error creating sign-in key: {}", e.getMessage());
            throw new RuntimeException("Failed to create signing key", e);
        }
    }
}