package org.example.ibpipeline.service;

import org.example.ibpipeline.event.DealEvent;
import org.example.ibpipeline.event.DealEventType;
import org.example.ibpipeline.exception.BadRequestException;
import org.example.ibpipeline.exception.ResourceNotFoundException;
import org.example.ibpipeline.model.Deal;
import org.example.ibpipeline.model.DealNote;
import org.example.ibpipeline.model.DealStage;
import org.example.ibpipeline.repository.DealRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class DealService {

    private final DealRepository dealRepository;
    private final KafkaProducerService kafkaProducerService;

    public DealService(DealRepository dealRepository, KafkaProducerService kafkaProducerService) {
        this.dealRepository = dealRepository;
        this.kafkaProducerService = kafkaProducerService;
    }

    // =========================
    // CREATE DEAL
    // =========================
    public Deal createDeal(Deal deal, String createdByUserId) {
        deal.setCreatedBy(createdByUserId);
        deal.setCurrentStage(DealStage.Prospect);
        deal.setCreatedAt(Instant.now());
        deal.setUpdatedAt(Instant.now());
        Deal savedDeal = dealRepository.save(deal);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.DEAL_CREATED,
                savedDeal.getId(),
                savedDeal.getClientName(),
                createdByUserId,
                "Deal created with stage: " + savedDeal.getCurrentStage(),
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);

        return savedDeal;
    }

    // =========================
    // GET DEALS
    // =========================
    public List<Deal> getAllDeals() {
        return dealRepository.findAll();
    }

    public Deal getDealById(String id) {
        return dealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deal not found"));
    }

    // =========================
    // UPDATE BASIC FIELDS
    // =========================
    public Deal updateBasicFields(String id,
                                  String summary,
                                  String sector,
                                  String dealType) {

        Deal deal = getDealById(id);

        deal.setSummary(summary);
        deal.setSector(sector);
        deal.setDealType(dealType);
        deal.setUpdatedAt(Instant.now());

        Deal updatedDeal = dealRepository.save(deal);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.DEAL_UPDATED,
                updatedDeal.getId(),
                updatedDeal.getClientName(),
                null,
                "Deal fields updated: summary, sector, dealType",
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);

        return updatedDeal;
    }

    // =========================
    // UPDATE STAGE
    // =========================
    public Deal updateStage(String id, DealStage stage) {
        Deal deal = getDealById(id);
        DealStage oldStage = deal.getCurrentStage();
        deal.setCurrentStage(stage);
        deal.setUpdatedAt(Instant.now());
        Deal updatedDeal = dealRepository.save(deal);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.STAGE_UPDATED,
                updatedDeal.getId(),
                updatedDeal.getClientName(),
                null,
                "Stage changed from " + oldStage + " to " + stage,
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);

        return updatedDeal;
    }

    // =========================
    // ADD NOTE
    // =========================
    public Deal addNote(String id, String userId, String noteText) {
        if (noteText == null || noteText.isBlank()) {
            throw new BadRequestException("Note cannot be empty");
        }

        Deal deal = getDealById(id);

        DealNote note = new DealNote();
        note.setUserId(userId);
        note.setNote(noteText);
        note.setTimestamp(Instant.now());

        deal.getNotes().add(note);
        deal.setUpdatedAt(Instant.now());

        Deal updatedDeal = dealRepository.save(deal);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.NOTE_ADDED,
                updatedDeal.getId(),
                updatedDeal.getClientName(),
                userId,
                "Note added: " + (noteText.length() > 50 ? noteText.substring(0, 50) + "..." : noteText),
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);

        return updatedDeal;
    }

    // =========================
    // UPDATE DEAL VALUE (ADMIN)
    // =========================
    public Deal updateDealValue(String id, Long value) {
        if (value == null || value < 0) {
            throw new BadRequestException("Deal value must be positive");
        }

        Deal deal = getDealById(id);
        Long oldValue = deal.getDealValue();
        deal.setDealValue(value);
        deal.setUpdatedAt(Instant.now());

        Deal updatedDeal = dealRepository.save(deal);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.VALUE_UPDATED,
                updatedDeal.getId(),
                updatedDeal.getClientName(),
                null,
                "Deal value updated from " + oldValue + " to " + value,
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);

        return updatedDeal;
    }

    // =========================
    // DELETE DEAL (ADMIN)
    // =========================
    public void deleteDeal(String id) {
        if (!dealRepository.existsById(id)) {
            throw new ResourceNotFoundException("Deal not found");
        }
        Deal deal = getDealById(id);

        dealRepository.deleteById(id);

        // Publish Kafka event
        DealEvent event = new DealEvent(
                UUID.randomUUID().toString(),
                DealEventType.DEAL_DELETED,
                deal.getId(),
                deal.getClientName(),
                null,
                "Deal deleted permanently",
                Instant.now()
        );
        kafkaProducerService.sendDealEvent(event);
    }
}
