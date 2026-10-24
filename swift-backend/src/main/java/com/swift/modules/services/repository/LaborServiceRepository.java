package com.swift.modules.services.repository;

import com.swift.modules.services.model.LaborServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LaborServiceRepository extends JpaRepository<LaborServiceEntity, UUID> {

    Optional<LaborServiceEntity> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<LaborServiceEntity> findByActiveOrderByCodeAsc(boolean active);

    List<LaborServiceEntity> findAllByOrderByCodeAsc();

    List<LaborServiceEntity> findByBayIgnoreCaseOrderByCodeAsc(String bay);

    List<LaborServiceEntity> findByNameContainingIgnoreCaseOrderByCodeAsc(String keyword);
}
