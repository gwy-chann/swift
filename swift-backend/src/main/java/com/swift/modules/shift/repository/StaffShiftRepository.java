package com.swift.modules.shift.repository;

import com.swift.modules.shift.model.StaffShift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffShiftRepository extends JpaRepository<StaffShift, UUID> {

    Optional<StaffShift> findFirstByProfileIdAndStatusInOrderByClockInDesc(UUID profileId, Collection<String> statuses);

    boolean existsByProfileIdAndStatusIn(UUID profileId, Collection<String> statuses);

    Page<StaffShift> findByProfileIdOrderByClockInDesc(UUID profileId, Pageable pageable);

    Page<StaffShift> findAllByOrderByClockInDesc(Pageable pageable);

    @Query("SELECT s FROM StaffShift s WHERE s.profileId = :profileId AND s.clockIn >= :startDate AND s.clockIn <= :endDate ORDER BY s.clockIn DESC")
    Page<StaffShift> findByProfileIdAndClockInBetween(
        @Param("profileId") UUID profileId,
        @Param("startDate") OffsetDateTime startDate,
        @Param("endDate") OffsetDateTime endDate,
        Pageable pageable
    );

    @Query("SELECT s FROM StaffShift s WHERE s.clockIn >= :startDate AND s.clockIn <= :endDate ORDER BY s.clockIn DESC")
    Page<StaffShift> findByClockInBetween(
        @Param("startDate") OffsetDateTime startDate,
        @Param("endDate") OffsetDateTime endDate,
        Pageable pageable
    );
}
