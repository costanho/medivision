package com.carenexus.auth.controller;

import com.carenexus.auth.model.UserInformation;
import com.carenexus.auth.repository.UserInformationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/user-information")
@RequiredArgsConstructor
public class UserInformationController {

    private final UserInformationRepository userInformationRepository;

    /** 👤 Get all user information (paginated) */
    @GetMapping
    public ResponseEntity<Page<UserInformation>> getAllUserInformation(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<UserInformation> allUsers = userInformationRepository.findAll();
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, allUsers.size());
        List<UserInformation> paginatedUsers = allUsers.subList(start, end);

        Page<UserInformation> result = new PageImpl<>(paginatedUsers, pageable, allUsers.size());
        return ResponseEntity.ok(result);
    }

    /** 👤 Get user information by ID */
    @GetMapping("/{id}")
    public ResponseEntity<UserInformation> getUserInformationById(@PathVariable Long id) {
        UserInformation userInfo = userInformationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User information not found"));
        return ResponseEntity.ok(userInfo);
    }

    /** 👤 Get user information by reference number */
    @GetMapping("/reference/{referenceNumber}")
    public ResponseEntity<UserInformation> getUserInformationByReference(@PathVariable String referenceNumber) {
        UserInformation userInfo = userInformationRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new RuntimeException("User information not found for reference: " + referenceNumber));
        return ResponseEntity.ok(userInfo);
    }

    /** 👤 Get user information by gender */
    @GetMapping("/gender/{gender}")
    public ResponseEntity<Page<UserInformation>> getUserInformationByGender(
            @PathVariable String gender,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<UserInformation> users = userInformationRepository.findByGender(gender);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, users.size());
        List<UserInformation> paginatedUsers = users.subList(start, end);

        Page<UserInformation> result = new PageImpl<>(paginatedUsers, pageable, users.size());
        return ResponseEntity.ok(result);
    }

    /** 👤 Get user information by city */
    @GetMapping("/city/{city}")
    public ResponseEntity<Page<UserInformation>> getUserInformationByCity(
            @PathVariable String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<UserInformation> users = userInformationRepository.findByCity(city);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, users.size());
        List<UserInformation> paginatedUsers = users.subList(start, end);

        Page<UserInformation> result = new PageImpl<>(paginatedUsers, pageable, users.size());
        return ResponseEntity.ok(result);
    }

    /** 👤 Get user information by address */
    @GetMapping("/address/{address}")
    public ResponseEntity<Page<UserInformation>> getUserInformationByAddress(
            @PathVariable String address,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<UserInformation> users = userInformationRepository.findByAddress(address);
        Pageable pageable = PageRequest.of(page, size);

        int start = page * size;
        int end = Math.min(start + size, users.size());
        List<UserInformation> paginatedUsers = users.subList(start, end);

        Page<UserInformation> result = new PageImpl<>(paginatedUsers, pageable, users.size());
        return ResponseEntity.ok(result);
    }
}
