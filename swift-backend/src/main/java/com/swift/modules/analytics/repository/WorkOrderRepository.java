package com.swift.modules.analytics.repository;

import com.swift.modules.analytics.model.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID> {

    List<WorkOrder> findByStatusIn(Collection<String> statuses);

    Optional<WorkOrder> findFirstByBayIdAndStatusInOrderByCreatedAtDesc(UUID bayId, Collection<String> statuses);

    long countByStatus(String status);

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status IN ('QUEUED', 'IN PROGRESS', 'PENDING_PARTS')")
    long countActiveWorkOrders();

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status = 'PENDING_PARTS'")
    long countPendingParts();
}
