package com.swift.modules.catalog.repository;

import com.swift.modules.catalog.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    Optional<Product> findBySkuIgnoreCase(String sku);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE LOWER(p.sku) = LOWER(:sku)")
    Optional<Product> findWithPessimisticLockBySku(@Param("sku") String sku);

    boolean existsBySkuIgnoreCase(String sku);

    java.util.List<Product> findAllByOrderByNameAsc();

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY p.name ASC LIMIT 1")
    Optional<Product> findFirstByNameContainingIgnoreCase(@Param("query") String query);

    @Query("SELECT p FROM Product p WHERE " +
           "(:query IS NULL OR :query = '' OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:category IS NULL OR :category = '' OR LOWER(p.category) = LOWER(:category)) " +
           "ORDER BY p.name ASC")
    java.util.List<Product> searchProducts(@Param("query") String query, @Param("category") String category);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.stock <= p.minThreshold")
    long countByStockLessThanEqualMinThreshold();
}
