package com.carenexus.auth.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "user_information")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInformation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    @Column(name = "reference_number")
    private String referenceNumber;

    @Column(nullable = false)
    private String country;

    @Column(name = "national_id")
    private String nationalId;

    @Column(nullable = false)
    private String passport;
}
