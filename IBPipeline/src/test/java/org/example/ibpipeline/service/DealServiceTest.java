package org.example.ibpipeline.service;

import org.example.ibpipeline.exception.BadRequestException;
import org.example.ibpipeline.exception.ResourceNotFoundException;
import org.example.ibpipeline.model.Deal;
import org.example.ibpipeline.model.DealStage;
import org.example.ibpipeline.repository.DealRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DealServiceTest {

    @Mock
    private DealRepository dealRepository;

    @InjectMocks
    private DealService dealService;

    private Deal deal;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        deal = new Deal();
        deal.setId("1");
        deal.setClientName("Acme Capital");
        deal.setSector("Manufacturing");
        deal.setDealType("M&A");
        deal.setNotes(new ArrayList<>());
    }

    @Test
    void createDeal_setsDefaultsAndSaves() {
        when(dealRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        Deal created = dealService.createDeal(deal, "user1");

        assertEquals("user1", created.getCreatedBy());
        assertEquals(DealStage.Prospect, created.getCurrentStage());
        assertNotNull(created.getCreatedAt());
        assertNotNull(created.getUpdatedAt());

        verify(dealRepository).save(any());
    }

    @Test
    void getAllDeals_returnsList() {
        when(dealRepository.findAll())
                .thenReturn(List.of(deal));

        List<Deal> result = dealService.getAllDeals();

        assertEquals(1, result.size());
        assertEquals("Acme Capital", result.get(0).getClientName());
    }

    @Test
    void getDealById_success() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));

        Deal found = dealService.getDealById("1");

        assertEquals("Acme Capital", found.getClientName());
    }

    @Test
    void getDealById_notFound() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> dealService.getDealById("1"));
    }

    @Test
    void updateBasicFields_updatesAndSaves() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));
        when(dealRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        Deal updated = dealService.updateBasicFields(
                "1", "New summary", "Tech", "IPO");

        assertEquals("New summary", updated.getSummary());
        assertEquals("Tech", updated.getSector());
        assertEquals("IPO", updated.getDealType());
    }

    @Test
    void updateStage_changesStage() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));
        when(dealRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        Deal updated = dealService.updateStage("1", DealStage.Closed);

        assertEquals(DealStage.Closed, updated.getCurrentStage());
    }

    @Test
    void addNote_success() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));
        when(dealRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        Deal updated = dealService.addNote("1", "user1", "Initial call done");

        assertEquals(1, updated.getNotes().size());
        assertEquals("Initial call done", updated.getNotes().get(0).getNote());
        assertEquals("user1", updated.getNotes().get(0).getUserId());
    }

    @Test
    void addNote_empty_throws() {
        assertThrows(BadRequestException.class,
                () -> dealService.addNote("1", "user1", ""));
    }

    @Test
    void updateDealValue_success() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));
        when(dealRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        Deal updated = dealService.updateDealValue("1", 500000L);

        assertEquals(500000L, updated.getDealValue());
    }

    @Test
    void updateDealValue_negative_throws() {
        when(dealRepository.findById("1"))
                .thenReturn(Optional.of(deal));

        assertThrows(BadRequestException.class,
                () -> dealService.updateDealValue("1", -10L));
    }

    @Test
    void deleteDeal_success() {
        when(dealRepository.existsById("1"))
                .thenReturn(true);

        dealService.deleteDeal("1");

        verify(dealRepository).deleteById("1");
    }

    @Test
    void deleteDeal_notFound() {
        when(dealRepository.existsById("1"))
                .thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> dealService.deleteDeal("1"));
    }
}
