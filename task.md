## API Build TODO

### 1. Core Missing APIs (Build First)

- [ ] **Payment API module**
- [ ] Create `payment.controllers.ts`
- [ ] Create `payment.routes.ts`
- [ ] Add `GET /payment/job/:jobId`
- [ ] Add `GET /payment/reference/:reference`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Wallet API module**
- [ ] Create `wallet.services.ts`
- [ ] Create `wallet.controllers.ts`
- [ ] Create `wallet.routes.ts`
- [ ] Add `GET /wallet/me`
- [ ] Add `GET /wallet/summary`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Transaction Ledger API module**
- [ ] Create `transaction-ledger.services.ts`
- [ ] Create `transaction-ledger.controllers.ts`
- [ ] Create `transaction-ledger.routes.ts`
- [ ] Add `GET /transactions/me`
- [ ] Add `GET /transactions/job/:jobId`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Payout API module**
- [ ] Create `payout.services.ts`
- [ ] Create `payout.controllers.ts`
- [ ] Create `payout.routes.ts`
- [ ] Add `POST /payout/request`
- [ ] Add `GET /payout/me`
- [ ] Add `PATCH /payout/:id/cancel`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Dispute Admin API**
- [ ] Create `dispute.services.ts`
- [ ] Create `dispute.controllers.ts`
- [ ] Create `dispute.routes.ts`
- [ ] Add `GET /dispute/open`
- [ ] Add `PATCH /dispute/:id/resolve`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Conversation API module**
- [ ] Create `conversation.services.ts`
- [ ] Create `conversation.controllers.ts`
- [ ] Create `conversation.routes.ts`
- [ ] Add `POST /conversation/create`
- [ ] Add `GET /conversation/my`
- [ ] Add `GET /conversation/:id`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

- [ ] **Message API module**
- [ ] Create `message.services.ts`
- [ ] Create `message.controllers.ts`
- [ ] Create `message.routes.ts`
- [ ] Add `POST /message/send`
- [ ] Add `GET /message/conversation/:conversationId`
- [ ] Add `PATCH /message/:id/read`
- [ ] Register route in `apps/server/src/app/routes/index.ts`

---

### 2. Cross-Cutting Tasks

- [ ] Add validation schemas for every new endpoint
- [ ] Add auth guards and role checks
- [ ] Standardize response format using existing `sendResponse`
- [ ] Add error handling (`AppError` + proper status codes)
- [ ] Add pagination/filtering for list endpoints
- [ ] Add basic tests for each new module (happy path + auth fail)

---

### 3. Optional Internal APIs (Later)

- [ ] Escrow read APIs (admin/internal)
- [ ] JobStatusHistory read APIs (admin/internal)
- [ ] SubscriptionTransactions read APIs (admin/provider)
- [ ] OTP management APIs (only if needed beyond Auth module)
