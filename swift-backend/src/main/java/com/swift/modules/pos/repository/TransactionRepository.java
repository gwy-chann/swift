package com.swift.modules.pos.repository;

import com.swift.modules.pos.model.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByReceiptNumber(String receiptNumber);

    boolean existsByReceiptNumber(String receiptNumber);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.items ORDER BY t.createdAt DESC")
    List<Transaction> findAllWithItemsOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.items WHERE t.receiptNumber = :receiptNumber")
    Optional<Transaction> findByReceiptNumberWithItems(@Param("receiptNumber") String receiptNumber);
}
