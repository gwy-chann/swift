package com.swift.modules.services.repository;

import com.swift.modules.services.model.ServiceRateAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceRateAuditLogRepository extends JpaRepository<ServiceRateAuditLogEntity, UUID> {

    List<ServiceRateAuditLogEntity> findAllByOrderByCreatedAtDesc();

    List<ServiceRateAuditLogEntity> findByServiceIdOrderByCreatedAtDesc(UUID serviceId);

    List<ServiceRateAuditLogEntity> findByServiceCodeIgnoreCaseOrderByCreatedAtDesc(String serviceCode);
}
