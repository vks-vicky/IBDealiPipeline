package org.example.ibpipeline.repository;

import org.example.ibpipeline.model.Deal;
import org.example.ibpipeline.model.DealStage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DealRepository extends MongoRepository<Deal, String> {

    List<Deal> findByCurrentStage(DealStage stage);

    List<Deal> findByCreatedBy(String userId);

    List<Deal> findByAssignedTo(String userId);
}
