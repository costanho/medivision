package com.carenexus.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor      // 🔥 THIS gives you AuthResponse(String, String)
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
}