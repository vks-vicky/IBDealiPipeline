package org.example.ibpipeline.service;

import org.example.ibpipeline.exception.BadRequestException;
import org.example.ibpipeline.exception.ResourceNotFoundException;
import org.example.ibpipeline.model.Deal;
import org.example.ibpipeline.model.DealNote;
import org.example.ibpipeline.model.DealStage;
import org.example.ibpipeline.repository.DealRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class DealService {

    private final DealRepository dealRepository;

    public DealService(DealRepository dealRepository) {
        this.dealRepository = dealRepository;
    }

    // =========================
    // CREATE DEAL
    // =========================
    public Deal createDeal(Deal deal, String createdByUserId) {
        deal.setCreatedBy(createdByUserId);
        deal.setCurrentStage(DealStage.Prospect);
        deal.setCreatedAt(Instant.now());
        deal.setUpdatedAt(Instant.now());
        return dealRepository.save(deal);
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

        return dealRepository.save(deal);
    }

    // =========================
    // UPDATE STAGE
    // =========================
    public Deal updateStage(String id, DealStage stage) {
        Deal deal = getDealById(id);
        deal.setCurrentStage(stage);
        deal.setUpdatedAt(Instant.now());
        return dealRepository.save(deal);
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

        return dealRepository.save(deal);
    }

    // =========================
    // UPDATE DEAL VALUE (ADMIN)
    // =========================
    public Deal updateDealValue(String id, Long value) {
        if (value == null || value < 0) {
            throw new BadRequestException("Deal value must be positive");
        }

        Deal deal = getDealById(id);
        deal.setDealValue(value);
        deal.setUpdatedAt(Instant.now());

        return dealRepository.save(deal);
    }

    // =========================
    // DELETE DEAL (ADMIN)
    // =========================
    public void deleteDeal(String id) {
        if (!dealRepository.existsById(id)) {
            throw new ResourceNotFoundException("Deal not found");
        }
        dealRepository.deleteById(id);
    }
}
