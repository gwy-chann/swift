package com.swift.modules.pricing.repository;

import com.swift.modules.pricing.model.PricingRulesAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PricingRulesAuditLogRepository extends JpaRepository<PricingRulesAuditLog, UUID> {
    List<PricingRulesAuditLog> findAllByOrderByCreatedAtDesc();
}
