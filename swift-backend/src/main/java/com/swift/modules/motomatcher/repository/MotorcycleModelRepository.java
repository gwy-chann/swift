package com.swift.modules.motomatcher.repository;

import com.swift.modules.motomatcher.model.MotorcycleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MotorcycleModelRepository extends JpaRepository<MotorcycleModel, UUID> {
    List<MotorcycleModel> findAllByOrderByMakeAscModelAsc();
}
