package com.carenexus.auth.repository;

import com.carenexus.auth.model.UserInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserInformationRepository extends JpaRepository<UserInformation, Long> {
    Optional<UserInformation> findByReferenceNumber(String referenceNumber);
    List<UserInformation> findByGender(String gender);
    List<UserInformation> findByCity(String city);
    List<UserInformation> findByAddress(String address);
}
