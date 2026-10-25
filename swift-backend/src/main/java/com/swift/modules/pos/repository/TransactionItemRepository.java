package com.swift.modules.pos.repository;

import com.swift.modules.pos.model.TransactionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionItemRepository extends JpaRepository<TransactionItem, UUID> {
    List<TransactionItem> findByTransactionId(UUID transactionId);

    @Query("SELECT i FROM TransactionItem i WHERE i.itemSkuOrCode = :itemSkuOrCode")
    List<TransactionItem> findByItemSkuOrCode(@Param("itemSkuOrCode") String itemSkuOrCode);
}
