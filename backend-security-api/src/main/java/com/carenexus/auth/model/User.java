package com.carenexus.auth.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String referenceNumber;
    // System reference number for business identification (separate from database ID)
    // Format: {INITIALS}{ROLE_PREFIX}{DATE}{3-DIGIT-RANDOM}{TIME12H}
    // Example: "JEPA130326456-1430"

    @Column(unique = true)
    private String email;

    private String password;

    // Personal Information (matches frontend form data)
    private String firstName;
    private String lastName;

    @Column(name = "phone")
    private String mobilePhone;  // Frontend sends as mobilePhone (e.g., "+263712345678")

    // Account & Security
    private String role;  // PATIENT, DOCTOR, ADMIN

    /** UserDetails override methods */

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null || role.isEmpty()) {
            return Collections.emptyList();
        }
        return List.of(new SimpleGrantedAuthority(role));
    }

    @Override
    public String getUsername() {
        return email;  // used for login
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}