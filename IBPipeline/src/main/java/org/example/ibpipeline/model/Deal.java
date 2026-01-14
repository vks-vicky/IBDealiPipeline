package org.example.ibpipeline.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "deals")
public class Deal {

    @Id
    private String id;

    @NotBlank
    private String clientName;

    @NotBlank
    private String dealType;

    @NotBlank
    private String sector;

    /* Sensitive field – ADMIN only */
    private Long dealValue;

    @NotNull
    private DealStage currentStage = DealStage.Prospect;

    private String summary;

    private List<DealNote> notes = new ArrayList<>();

    private String createdBy;
    private String assignedTo;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();


    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getDealType() { return dealType; }
    public void setDealType(String dealType) { this.dealType = dealType; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public Long getDealValue() { return dealValue; }
    public void setDealValue(Long dealValue) { this.dealValue = dealValue; }

    public DealStage getCurrentStage() { return currentStage; }
    public void setCurrentStage(DealStage currentStage) { this.currentStage = currentStage; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public List<DealNote> getNotes() { return notes; }
    public void setNotes(List<DealNote> notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}