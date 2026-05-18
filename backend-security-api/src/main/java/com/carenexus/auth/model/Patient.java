package com.carenexus.auth.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "medical_condition")
    private String medicalCondition;

    @Column(name = "hiv_status")
    private String hivStatus;

    @Column(nullable = false)
    private String allergies;

    @Column(name = "current_medications")
    private String currentMedications;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "reference_number")
    private String referenceNumber;
}
