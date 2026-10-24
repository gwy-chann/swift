package com.swift.modules.pricing.repository;

import com.swift.modules.pricing.model.PricingRules;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PricingRulesRepository extends JpaRepository<PricingRules, Long> {
    default Optional<PricingRules> findActiveRules() {
        return findById(1L);
    }
}
