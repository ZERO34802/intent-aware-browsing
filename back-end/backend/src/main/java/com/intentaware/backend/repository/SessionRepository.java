package com.intentaware.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.intentaware.backend.entity.Session;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {

}