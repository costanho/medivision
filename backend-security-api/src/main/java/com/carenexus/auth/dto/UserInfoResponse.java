package com.carenexus.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfoResponse {

    private Long id;
    private String referenceNumber;

    // Personal Information
    private String email;
    private String firstName;
    private String lastName;
    private String phone;

    // Account & Security
    private String role;
}