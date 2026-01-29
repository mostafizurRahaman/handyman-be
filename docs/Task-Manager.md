# 15-Day API Development Work Plan (Task-Based Service Platform)

This document breaks down **all required APIs**, grouped logically, with **clear endpoints**, goals, and a **15-day execution plan**. The plan assumes:

- Backend: Node.js + Express/Nest
- Auth: JWT
- DB: MongoDB (users, jobs, conversations) + SQL (payments, subscriptions)
- Payment: Paystack

---

## Day 1 – Project Setup & Core Infrastructure

### Goals

- Solid foundation for scalable API development

### Tasks

- Project structure setup
- Environment config (dev/stage/prod)
- Database connections (MongoDB + SQL)
- Global error handler
- API response standardization

### APIs

- `GET /health`
- `GET /version`

---

## Day 2 – Authentication & Authorization

### APIs

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Notes

- Role-based access (ADMIN, CUSTOMER, PROVIDER)
- JWT + refresh tokens

---

## Day 3 – OTP & Account Verification

### APIs

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/resend-otp`

### Logic

- Update `isOtpVerified`
- Rate limiting

---

## Day 4 – User Profile Management

### APIs

- `GET /users/me`
- `PUT /users/me`
- `PUT /users/change-password`
- `DELETE /users/me`

### Admin APIs

- `GET /admin/users`
- `PATCH /admin/users/:id/status`

---

## Day 5 – Provider Module

### APIs

- `POST /providers`
- `GET /providers/me`
- `PUT /providers/me`
- `GET /providers/:id`

### Notes

- Link provider to user
- Service categories validation

---

## Day 6 – Document Verification (NID)

### APIs

- `POST /verification`
- `GET /verification/me`
- `PATCH /admin/verification/:userId`

### Status Flow

`pending → verified / rejected`

---

## Day 7 – Service Category Management

### APIs

- `POST /categories`
- `GET /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

### Access

- Admin only for write

---

## Day 8 – Job Management (Customer)

### APIs

- `POST /jobs`
- `GET /jobs/my-jobs`
- `GET /jobs/:id`
- `PUT /jobs/:id`
- `DELETE /jobs/:id`

---

## Day 9 – Job Applications (Provider)

### APIs

- `POST /job-applications`
- `GET /job-applications/job/:jobId`
- `PATCH /job-applications/:id`

### Logic

- Prevent duplicate applications

---

## Day 10 – Job Assignment & Status Flow

### APIs

- `POST /jobs/:id/assign`
- `PATCH /jobs/:id/status`
- `GET /jobs/:id/history`

### Status Tracking

- jobStatusHistory insert on every change

---

## Day 11 – Reviews & Ratings

### APIs

- `POST /reviews`
- `GET /reviews/provider/:providerId`
- `GET /reviews/job/:jobId`

### Rules

- Only after job completion

---

## Day 12 – Conversations & Messages

### Conversation APIs

- `POST /conversations`
- `GET /conversations`
- `GET /conversations/:id`
- `PATCH /conversations/:id/close`

### Message APIs

- `POST /messages`
- `GET /messages/conversation/:conversationId`
- `PATCH /messages/:id/read`

---

## Day 13 – Payments & Escrow (Paystack)

### Payment APIs

- `POST /payments/initiate`
- `POST /payments/webhook`
- `GET /payments/job/:jobId`

### Escrow APIs

- `POST /escrows/lock`
- `POST /escrows/release`
- `POST /escrows/refund`

---

## Day 14 – Payouts & Ledger

### Payout APIs

- `POST /payouts/initiate`
- `GET /payouts/provider/me`

### Ledger APIs

- `GET /ledger/user/:userId`
- `GET /ledger/job/:jobId`

---

## Day 15 – Subscriptions & Finalization

### Subscription APIs

- `GET /subscription-plans`
- `POST /subscriptions`
- `GET /subscriptions/me`
- `POST /subscriptions/cancel`

### Subscription Transactions

- `GET /subscription-transactions/:subscriptionId`

### Final Tasks

- API documentation
- Postman collection
- Validation & edge cases
- Production readiness checklist

---

## Deliverables After 15 Days

- 100% API coverage
- Secure RBAC
- Paystack integration
- Scalable messaging system
- Clean audit & ledger system

---

If you want next:

- ✅ **Postman Collection**
- ✅ **DB Indexing Plan**
- ✅ **Swagger/OpenAPI Spec**
- ✅ **Controller–Service–Repo folder structure**

Just tell me 👍
