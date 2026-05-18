package com.carenexus.auth.repository;

import com.carenexus.auth.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByReferenceNumber(String referenceNumber);
    List<Patient> findByMedicalCondition(String medicalCondition);
    List<Patient> findByAllergiesContainingIgnoreCase(String allergies);
}
