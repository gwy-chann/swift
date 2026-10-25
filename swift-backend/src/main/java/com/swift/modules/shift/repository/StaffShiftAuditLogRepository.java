package com.swift.modules.shift.repository;

import com.swift.modules.shift.model.StaffShiftAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffShiftAuditLogRepository extends JpaRepository<StaffShiftAuditLog, UUID> {

    List<StaffShiftAuditLog> findByShiftIdOrderByCreatedAtDesc(UUID shiftId);

    List<StaffShiftAuditLog> findByProfileIdOrderByCreatedAtDesc(UUID profileId);
}
