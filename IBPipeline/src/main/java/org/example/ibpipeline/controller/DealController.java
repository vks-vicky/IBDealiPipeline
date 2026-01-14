package org.example.ibpipeline.controller;

import jakarta.validation.Valid;
import org.example.ibpipeline.model.Deal;
import org.example.ibpipeline.model.DealStage;
import org.example.ibpipeline.service.DealService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class DealController {

    private final DealService dealService;

    public DealController(DealService dealService) {
        this.dealService = dealService;
    }

    // =========================
    // CREATE DEAL
    // =========================
    @PostMapping
    public ResponseEntity<Deal> createDeal(@Valid @RequestBody Deal deal,
                                           Authentication authentication) {

        String username = authentication.getName();

        Deal created = dealService.createDeal(deal, username);
        return ResponseEntity.ok(created);
    }

    // =========================
    // LIST DEALS
    // =========================
    @GetMapping
    public ResponseEntity<List<Deal>> getAllDeals() {
        return ResponseEntity.ok(dealService.getAllDeals());
    }

    // =========================
    // GET DEAL BY ID
    // =========================
    @GetMapping("/{id}")
    public ResponseEntity<Deal> getDeal(@PathVariable String id) {
        return ResponseEntity.ok(dealService.getDealById(id));
    }

    // =========================
    // UPDATE BASIC FIELDS
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<Deal> updateBasicFields(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {

        String summary = body.get("summary");
        String sector = body.get("sector");
        String dealType = body.get("dealType");

        Deal updated = dealService.updateBasicFields(id, summary, sector, dealType);
        return ResponseEntity.ok(updated);
    }

    // =========================
    // UPDATE STAGE
    // =========================
    @PatchMapping("/{id}/stage")
    public ResponseEntity<Deal> updateStage(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {

        DealStage stage = DealStage.valueOf(body.get("stage"));
        Deal updated = dealService.updateStage(id, stage);
        return ResponseEntity.ok(updated);
    }

    // =========================
    // ADD NOTE
    // =========================
    @PostMapping("/{id}/notes")
    public ResponseEntity<Deal> addNote(@PathVariable String id,
                                        @RequestBody Map<String, String> body,
                                        Authentication authentication) {

        String note = body.get("note");
        String userId = authentication.getName();

        Deal updated = dealService.addNote(id, userId, note);
        return ResponseEntity.ok(updated);
    }

    // =========================
    // UPDATE DEAL VALUE (ADMIN)
    // =========================
    @PatchMapping("/{id}/value")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Deal> updateDealValue(@PathVariable String id,
                                                @RequestBody Map<String, Long> body) {

        Long value = body.get("dealValue");
        Deal updated = dealService.updateDealValue(id, value);
        return ResponseEntity.ok(updated);
    }

    // =========================
    // DELETE DEAL (ADMIN)
    // =========================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDeal(@PathVariable String id) {
        dealService.deleteDeal(id);
        return ResponseEntity.noContent().build();
    }
}
