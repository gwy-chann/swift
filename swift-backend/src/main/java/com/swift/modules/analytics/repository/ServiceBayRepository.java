package com.swift.modules.analytics.repository;

import com.swift.modules.analytics.model.ServiceBay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceBayRepository extends JpaRepository<ServiceBay, UUID> {

    List<ServiceBay> findAllByOrderByDisplayOrderAsc();

    long countByStatus(String status);
}
