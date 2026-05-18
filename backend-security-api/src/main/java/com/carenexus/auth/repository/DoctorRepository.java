package com.carenexus.auth.repository;

import com.carenexus.auth.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByReference(String reference);
    List<Doctor> findBySpecialization(String specialization);
    List<Doctor> findByCity(String city);
    List<Doctor> findByNameContainingIgnoreCase(String name);
    List<Doctor> findByRatingGreaterThanEqual(java.math.BigDecimal rating);
}
