package com.swift.modules.auth.repository;

import com.swift.modules.auth.model.SecurityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {

    List<SecurityAuditLog> findAllByOrderByCreatedAtDesc();

    List<SecurityAuditLog> findBySeverityOrderByCreatedAtDesc(String severity);

    @Query("SELECT s FROM SecurityAuditLog s WHERE " +
           "(:severity IS NULL OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "(:search IS NULL OR LOWER(s.action) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.userEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.terminalIp) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    Page<SecurityAuditLog> findWithFilters(
            @Param("severity") String severity,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT s FROM SecurityAuditLog s WHERE " +
           "(:severity IS NULL OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "(:search IS NULL OR LOWER(s.action) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.userEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.terminalIp) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<SecurityAuditLog> findWithFiltersList(
            @Param("severity") String severity,
            @Param("search") String search
    );
}
