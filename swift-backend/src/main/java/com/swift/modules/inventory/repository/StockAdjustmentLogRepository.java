package com.swift.modules.inventory.repository;

import com.swift.modules.inventory.model.StockAdjustmentLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockAdjustmentLogRepository extends JpaRepository<StockAdjustmentLog, UUID> {

    List<StockAdjustmentLog> findBySkuOrderByCreatedAtDesc(String sku);

    List<StockAdjustmentLog> findAllByOrderByCreatedAtDesc();

    @Query("SELECT l FROM StockAdjustmentLog l WHERE " +
           "(:sku IS NULL OR :sku = '' OR LOWER(l.sku) LIKE LOWER(CONCAT('%', :sku, '%'))) AND " +
           "(:adjustmentType IS NULL OR :adjustmentType = '' OR :adjustmentType = 'All' OR LOWER(l.adjustmentType) = LOWER(:adjustmentType)) AND " +
           "(:startDate IS NULL OR l.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR l.createdAt <= :endDate) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(l.sku) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(l.reason) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(l.userName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY l.createdAt DESC")
    Page<StockAdjustmentLog> findWithFilters(
            @Param("sku") String sku,
            @Param("adjustmentType") String adjustmentType,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT l FROM StockAdjustmentLog l WHERE " +
           "(:sku IS NULL OR :sku = '' OR LOWER(l.sku) LIKE LOWER(CONCAT('%', :sku, '%'))) AND " +
           "(:adjustmentType IS NULL OR :adjustmentType = '' OR :adjustmentType = 'All' OR LOWER(l.adjustmentType) = LOWER(:adjustmentType)) AND " +
           "(:startDate IS NULL OR l.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR l.createdAt <= :endDate) " +
           "ORDER BY l.createdAt DESC")
    List<StockAdjustmentLog> findForExport(
            @Param("sku") String sku,
            @Param("adjustmentType") String adjustmentType,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate
    );
}
