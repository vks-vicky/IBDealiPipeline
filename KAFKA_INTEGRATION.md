# Kafka Integration - Testing Guide

## ✅ Kafka is Successfully Integrated!

### What Was Implemented:

1. **Kafka Events** - 6 event types:
   - `DEAL_CREATED` - When a new deal is created
   - `DEAL_UPDATED` - When deal fields (summary, sector, dealType) are updated
   - `STAGE_UPDATED` - When deal stage changes
   - `NOTE_ADDED` - When a note is added to a deal
   - `VALUE_UPDATED` - When deal value is changed (admin only)
   - `DEAL_DELETED` - When a deal is deleted (admin only)

2. **Components Created**:
   - `KafkaConfig.java` - Producer & Consumer configuration
   - `KafkaTopicConfig.java` - Topic configuration (deal-events)
   - `DealEvent.java` - Event model
   - `DealEventType.java` - Event type enum
   - `KafkaProducerService.java` - Publishes events to Kafka
   - `KafkaConsumerService.java` - Consumes and logs events
   - `DealService.java` - Updated to publish events on all deal operations

### Where to See Kafka Messages:

#### 1. **Backend Logs** (Primary Method)
Every Kafka event is automatically logged in the backend logs with full details:

```bash
docker logs ibpipeline-backend -f
```

Look for logs like:
```
==============================================
📨 Consumed Deal Event from Kafka
Event Type: DEAL_CREATED
Deal ID: 67713abc1234...
Deal Client Name: Acme Corp
User ID: 67713def5678...
Details: Deal created with stage: Prospect
Timestamp: 2026-01-22T...
Partition: 0 | Offset: 42
==============================================
```

#### 2. **Kafka UI** (Visual Interface)
- Open browser: http://localhost:8081
- Go to **Topics** → **deal-events**
- Click **Messages** to see all published events
- You can view:
  - Message key (dealId)
  - Message value (full event JSON)
  - Partition & offset
  - Timestamp

#### 3. **Testing the Integration**:

**Step 1: Login to the application**
- Go to http://localhost
- Login with: admin / admin123

**Step 2: Create a Deal**
- Navigate to "Deals" section
- Click "Create New Deal"
- Fill in details (Client Name, Deal Type, Sector)
- Submit

**Step 3: Check the Kafka Event**
Method A - Backend Logs:
```bash
docker logs ibpipeline-backend --tail 50
```

Method B - Kafka UI:
- Go to http://localhost:8081/ui/clusters/local/topics/deal-events/messages
- You'll see the DEAL_CREATED event

**Step 4: Perform More Actions**
- Update deal stage → See STAGE_UPDATED event
- Add a note → See NOTE_ADDED event
- Update deal value (admin) → See VALUE_UPDATED event
- Update deal fields → See DEAL_UPDATED event
- Delete deal (admin) → See DEAL_DELETED event

### Event JSON Example:
```json
{
  "eventId": "a7b3c2d1-1234-5678-abcd-ef1234567890",
  "eventType": "DEAL_CREATED",
  "dealId": "67713abc12345678",
  "dealTitle": "Acme Corp",
  "userId": "67713def56789abc",
  "details": "Deal created with stage: Prospect",
  "timestamp": "2026-01-22T02:30:00.123Z"
}
```

### Kafka Configuration:
- **Topic**: deal-events
- **Partitions**: 3
- **Replication**: 1
- **Consumer Group**: deal-event-consumer-group
- **Bootstrap Servers**: kafka:9092 (internal), localhost:9092 (external)

### Next Steps:
1. Test by creating/updating deals in the frontend
2. Monitor events in Kafka UI or backend logs
3. Add custom business logic in `KafkaConsumerService.consumeDealEvent()` method:
   - Send email notifications
   - Update analytics dashboard
   - Trigger workflows
   - Sync to external systems
   - etc.

---

**All components are running successfully! 🎉**
