package com.swift.modules.auth.repository;

import com.swift.modules.auth.model.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, UUID> {
    Optional<StaffProfile> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<StaffProfile> findAllByOrderByCreatedAtAsc();
}
