package com.carenexus.auth.controller;

import com.carenexus.auth.model.Patient;
import com.carenexus.auth.model.Doctor;
import com.carenexus.auth.repository.PatientRepository;
import com.carenexus.auth.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/patient-doctor")
@RequiredArgsConstructor
public class PatientDoctorController {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    // ============================================================
    // PATIENT ENDPOINTS
    // ============================================================

    /** 👤 Get all patients (paginated) */
    @GetMapping("/patients")
    public ResponseEntity<Page<Patient>> getAllPatients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Patient> patients = patientRepository.findAll();
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, patients.size());
        List<Patient> paginatedPatients = patients.subList(start, end);

        Page<Patient> result = new PageImpl<>(paginatedPatients, pageable, patients.size());
        return ResponseEntity.ok(result);
    }

    /** 👤 Get patient by ID */
    @GetMapping("/patients/{id}")
    public ResponseEntity<Patient> getPatientById(@PathVariable Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return ResponseEntity.ok(patient);
    }

    /** 👤 Get patient by reference number */
    @GetMapping("/patients/reference/{reference}")
    public ResponseEntity<Patient> getPatientByReference(@PathVariable String reference) {
        Patient patient = patientRepository.findByReferenceNumber(reference)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return ResponseEntity.ok(patient);
    }

    /** 👤 Get patients by medical condition */
    @GetMapping("/patients/condition/{condition}")
    public ResponseEntity<Page<Patient>> getPatientsByCondition(
            @PathVariable String condition,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Patient> patients = patientRepository.findByMedicalCondition(condition);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, patients.size());
        List<Patient> paginatedPatients = patients.subList(start, end);

        Page<Patient> result = new PageImpl<>(paginatedPatients, pageable, patients.size());
        return ResponseEntity.ok(result);
    }

    /** 👤 Get patients by allergies */
    @GetMapping("/patients/allergies/{allergies}")
    public ResponseEntity<Page<Patient>> getPatientsByAllergies(
            @PathVariable String allergies,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Patient> patients = patientRepository.findByAllergiesContainingIgnoreCase(allergies);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, patients.size());
        List<Patient> paginatedPatients = patients.subList(start, end);

        Page<Patient> result = new PageImpl<>(paginatedPatients, pageable, patients.size());
        return ResponseEntity.ok(result);
    }

    // ============================================================
    // DOCTOR ENDPOINTS
    // ============================================================

    /** 👨‍⚕️ Get all doctors (paginated) */
    @GetMapping("/doctors")
    public ResponseEntity<Page<Doctor>> getAllDoctors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Doctor> doctors = doctorRepository.findAll();
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<Doctor> paginatedDoctors = doctors.subList(start, end);

        Page<Doctor> result = new PageImpl<>(paginatedDoctors, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }

    /** 👨‍⚕️ Get doctor by ID */
    @GetMapping("/doctors/{id}")
    public ResponseEntity<Doctor> getDoctorById(@PathVariable Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(doctor);
    }

    /** 👨‍⚕️ Get doctor by reference number */
    @GetMapping("/doctors/reference/{reference}")
    public ResponseEntity<Doctor> getDoctorByReference(@PathVariable String reference) {
        Doctor doctor = doctorRepository.findByReference(reference)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(doctor);
    }

    /** 👨‍⚕️ Get doctors by specialization */
    @GetMapping("/doctors/specialization/{specialization}")
    public ResponseEntity<Page<Doctor>> getDoctorsBySpecialization(
            @PathVariable String specialization,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Doctor> doctors = doctorRepository.findBySpecialization(specialization);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<Doctor> paginatedDoctors = doctors.subList(start, end);

        Page<Doctor> result = new PageImpl<>(paginatedDoctors, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }

    /** 👨‍⚕️ Get doctors by city */
    @GetMapping("/doctors/city/{city}")
    public ResponseEntity<Page<Doctor>> getDoctorsByCity(
            @PathVariable String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Doctor> doctors = doctorRepository.findByCity(city);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<Doctor> paginatedDoctors = doctors.subList(start, end);

        Page<Doctor> result = new PageImpl<>(paginatedDoctors, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }

    /** 👨‍⚕️ Get doctors by minimum rating */
    @GetMapping("/doctors/rating/{minRating}")
    public ResponseEntity<Page<Doctor>> getDoctorsByRating(
            @PathVariable java.math.BigDecimal minRating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Doctor> doctors = doctorRepository.findByRatingGreaterThanEqual(minRating);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<Doctor> paginatedDoctors = doctors.subList(start, end);

        Page<Doctor> result = new PageImpl<>(paginatedDoctors, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }

    /** 👨‍⚕️ Search doctors by name */
    @GetMapping("/doctors/search")
    public ResponseEntity<Page<Doctor>> searchDoctors(
            @RequestParam String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<Doctor> doctors = doctorRepository.findByNameContainingIgnoreCase(name);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, doctors.size());
        List<Doctor> paginatedDoctors = doctors.subList(start, end);

        Page<Doctor> result = new PageImpl<>(paginatedDoctors, pageable, doctors.size());
        return ResponseEntity.ok(result);
    }
}
