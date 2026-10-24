package com.swift.modules.motomatcher.repository;

import com.swift.modules.motomatcher.model.ProductFitment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductFitmentRepository extends JpaRepository<ProductFitment, UUID> {
    List<ProductFitment> findByModelId(UUID modelId);
    List<ProductFitment> findByProductId(UUID productId);
    Optional<ProductFitment> findByProductIdAndModelId(UUID productId, UUID modelId);
}
