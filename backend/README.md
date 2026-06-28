---
title: Azhar
emoji: 🌸
colorFrom: pink
colorTo: blue
sdk: docker
pinned: false
---

# Compound Management System API Server

This is the backend API server for the Compound Management System. It powers the Admin Web Panel, the Tenant Mobile App, the Staff Mobile App, and the Admin Mobile App.

---

## Technology Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: PostgreSQL (Knex.js Query Builder)
- **Security**: Helmet, CORS, Express-Rate-Limit, BCryptJS
- **Authentication**: Role-specific JWT access tokens & unified refresh tokens

---

## Getting Started

### 1. Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### 2. Database Configuration

1. Create a PostgreSQL database (e.g., `compound_db`).
2. Copy `.env.example` to `.env` and set your connection string and JWT secrets:
   ```bash
   cp .env.example .env
   ```
3. Initialize the database schema and seed the initial demo data:
   ```bash
   # Create tables, views, and triggers
   psql -U postgres -d compound_db -f database/schema.sql

   # Load demo compounds, admin accounts, technicians, villas, and leases
   psql -U postgres -d compound_db -f database/seed.sql
   ```

### 3. Run the Server

Start the development server with nodemon auto-reloading:
```bash
npm run dev
```

The server starts at `http://localhost:3000`. You can test the health check endpoint:
```bash
curl http://localhost:3000/api/health
```

---

## API Documentation & Postman Collections

Ready-to-use API collections are stored under `backend/collections/`:
1. **[tenant-app.json](file:///G:/azhar/backend/collections/tenant-app.json)**: Covers all tenant operations (Screens 27-46).
2. **[staff-app.json](file:///G:/azhar/backend/collections/staff-app.json)**: Covers technician task lifecycle and job logs (Screens 47-53).

To use these collections:
1. Import them into **Postman**, **Bruno**, or **Insomnia**.
2. Set up a environment variable named `base_url` pointing to `http://localhost:3000`.
3. Log in with one of the seed accounts to retrieve your token, then populate `tenant_token` / `staff_token` and the user/payment/request IDs to test all endpoints.

---

## Key Modules & Enpoints

### Auth Module
- `POST /api/auth/admin/login` - Admin Web Panel login
- `POST /api/auth/tenant/login` - Tenant app login (Phone or Email)
- `POST /api/auth/staff/login` - Staff app login (Phone)
- `POST /api/auth/refresh` - Refresh access tokens
- `GET  /api/auth/me` - Profile of logged-in user

### Operational Modules
- `/api/villas` - Villa Directory (Admin Web)
- `/api/tenants` - Tenant management, leases, and dependents list
- `/api/maintenance` - Tickets system (Tenant submits, Admin assigns, Staff starts & completes, Tenant rates)
- `/api/complaints` - Anonymous complaints with nested replies thread
- `/api/payments` - Rent Matrix, invoices, transaction logs, email reminders, and TXT receipts
- `/api/announcements` - Targeted notifications and broadcasts
- `/api/bus` - School bus routes and child rosters
- `/api/notifications` - In-app notification center and emergency broadcast trigger
- `/api/reports` - Dashboard KPI charts, financial breakdowns, and average maintenance response time analytics

---

## Security Features

1. **Separated Token Spaces**: Different JWT secrets are utilized for `admin`, `tenant`, and `staff` roles. An access token issued for a tenant cannot be used to authenticate admin routes.
2. **Request Rate Limiter**: Maximum of 200 general requests and 20 auth attempts per 15 minutes to prevent DDoS and brute-force attacks.
3. **Database Security**: Direct parameters injection protection via Knex query builder. Secure password storage using BCrypt with 12 salt rounds.
