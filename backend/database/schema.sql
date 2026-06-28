-- ============================================================
-- Compound Management System — Full PostgreSQL Schema
-- ============================================================
-- Run with: psql -U postgres -d compound_db -f schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Drop existing tables (safe re-run) ────────────────────
DROP TABLE IF EXISTS facility_bookings CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS bus_enrollments CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS complaint_replies CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS job_time_logs CASCADE;
DROP TABLE IF EXISTS maintenance_media CASCADE;
DROP TABLE IF EXISTS maintenance_assignments CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS service_ratings CASCADE;
DROP TABLE IF EXISTS dependents CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS villas CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS compounds CASCADE;

-- ─── Drop custom enum types (safe re-run) ──────────────────
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS villa_status CASCADE;
DROP TYPE IF EXISTS villa_type CASCADE;
DROP TYPE IF EXISTS maintenance_status CASCADE;
DROP TYPE IF EXISTS maintenance_priority CASCADE;
DROP TYPE IF EXISTS maintenance_category CASCADE;
DROP TYPE IF EXISTS media_phase CASCADE;
DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS complaint_category CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS announcement_type CASCADE;
DROP TYPE IF EXISTS enrollment_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS support_status CASCADE;
DROP TYPE IF EXISTS support_priority CASCADE;
DROP TYPE IF EXISTS lease_status CASCADE;
DROP TYPE IF EXISTS dependent_relation CASCADE;
DROP TYPE IF EXISTS facility_category CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;


-- ─────────────────────────────────────────────────────────────
-- COMMON FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. COMPOUNDS
-- The top-level entity. Every other record belongs to a compound.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE compounds (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    name_ar     VARCHAR(200),
    address     TEXT,
    city        VARCHAR(100),
    logo_url    TEXT,
    phone       VARCHAR(20),
    email       VARCHAR(150),
    settings    JSONB DEFAULT '{}'::jsonb,  -- flexible compound config
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 2. USERS
-- Single table for all user types — distinguished by role.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'tenant');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compound_id     INTEGER REFERENCES compounds(id) ON DELETE CASCADE,
    role            user_role NOT NULL,
    status          user_status DEFAULT 'active',

    -- Identity
    full_name       VARCHAR(200) NOT NULL,
    full_name_ar    VARCHAR(200),
    email           VARCHAR(150) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    national_id     VARCHAR(50),
    nationality     VARCHAR(100),
    avatar_url      TEXT,

    -- Auth
    password_hash   TEXT NOT NULL,
    fcm_token       TEXT,                  -- Firebase push notification token
    last_login_at   TIMESTAMPTZ,
    two_fa_enabled  BOOLEAN DEFAULT false,

    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_compound ON users(compound_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);


-- ─────────────────────────────────────────────────────────────
-- 3. AUTH SUPPORT TABLES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code        VARCHAR(6) NOT NULL,
    purpose     VARCHAR(50) DEFAULT 'login',  -- login | password_reset | 2fa
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_resets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 4. VILLAS
-- The physical units within the compound.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE villa_status AS ENUM ('occupied', 'vacant', 'maintenance', 'reserved');
CREATE TYPE villa_type AS ENUM ('villa', 'apartment', 'duplex', 'townhouse');

CREATE TABLE villas (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,

    -- Identity
    unit_number     VARCHAR(20) NOT NULL,   -- e.g. A-12, B-5
    block           VARCHAR(10),             -- Block / Phase
    villa_type      villa_type DEFAULT 'villa',
    status          villa_status DEFAULT 'vacant',

    -- Physical specs
    area_sqm        DECIMAL(8,2),
    bedrooms        SMALLINT,
    bathrooms       SMALLINT,
    floor           SMALLINT DEFAULT 0,
    has_garden      BOOLEAN DEFAULT false,
    has_pool        BOOLEAN DEFAULT false,
    has_garage      BOOLEAN DEFAULT true,

    -- Pricing
    monthly_rent    DECIMAL(10,2),
    annual_rent     DECIMAL(10,2),

    -- Media & notes
    photos          TEXT[],                  -- array of image URLs
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(compound_id, unit_number)
);

CREATE INDEX idx_villas_compound ON villas(compound_id);
CREATE INDEX idx_villas_status ON villas(status);


-- ─────────────────────────────────────────────────────────────
-- 5. LEASES
-- Contracts linking a tenant to a villa for a period.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');

CREATE TABLE leases (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    villa_id        INTEGER NOT NULL REFERENCES villas(id),
    tenant_id       UUID NOT NULL REFERENCES users(id),

    -- Contract dates
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          lease_status DEFAULT 'pending',

    -- Financial
    monthly_rent    DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    payment_due_day SMALLINT DEFAULT 1,     -- day of month rent is due

    -- Contract details
    contract_number VARCHAR(50),
    contract_url    TEXT,                   -- PDF URL
    notes           TEXT,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_villa ON leases(villa_id);
CREATE INDEX idx_leases_status ON leases(status);


-- ─────────────────────────────────────────────────────────────
-- 6. DEPENDENTS
-- Family members of a tenant (for bus enrollment, access control).
-- ─────────────────────────────────────────────────────────────
CREATE TYPE dependent_relation AS ENUM ('spouse', 'child', 'parent', 'sibling', 'other');

CREATE TABLE dependents (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,

    full_name       VARCHAR(200) NOT NULL,
    full_name_ar    VARCHAR(200),
    relation        dependent_relation NOT NULL,
    date_of_birth   DATE,
    national_id     VARCHAR(50),
    avatar_url      TEXT,

    -- School bus eligibility
    school_name     VARCHAR(200),
    school_grade    VARCHAR(50),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dependents_tenant ON dependents(tenant_id);


-- ─────────────────────────────────────────────────────────────
-- 7. MAINTENANCE REQUESTS
-- Full lifecycle: submitted → assigned → in_progress → completed
-- ─────────────────────────────────────────────────────────────
CREATE TYPE maintenance_status AS ENUM (
    'submitted', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'
);
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE maintenance_category AS ENUM (
    'plumbing', 'electrical', 'ac_hvac', 'painting', 'carpentry',
    'cleaning', 'pest_control', 'appliances', 'security', 'other'
);

CREATE TABLE maintenance_requests (
    id              SERIAL PRIMARY KEY,
    ticket_number   VARCHAR(20) UNIQUE,     -- e.g. MNT-1042
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    villa_id        INTEGER REFERENCES villas(id),
    tenant_id       UUID NOT NULL REFERENCES users(id),
    assigned_to     UUID REFERENCES users(id),   -- staff member

    -- Request details
    category        maintenance_category NOT NULL,
    priority        maintenance_priority DEFAULT 'medium',
    status          maintenance_status DEFAULT 'submitted',
    title           VARCHAR(300) NOT NULL,
    description     TEXT,

    -- Scheduling
    preferred_date  DATE,
    preferred_time  VARCHAR(50),            -- e.g. "morning", "afternoon"
    scheduled_at    TIMESTAMPTZ,

    -- Completion
    completed_at    TIMESTAMPTZ,
    technician_notes TEXT,

    -- Rating
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    rating_comment  TEXT,
    rated_at        TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate ticket numbers
CREATE SEQUENCE maintenance_ticket_seq START 1000;

CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'MNT-' || LPAD(NEXTVAL('maintenance_ticket_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_ticket_number
    BEFORE INSERT ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

CREATE INDEX idx_maintenance_compound ON maintenance_requests(compound_id);
CREATE INDEX idx_maintenance_tenant ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_assigned ON maintenance_requests(assigned_to);


-- ─────────────────────────────────────────────────────────────
-- 8. MAINTENANCE MEDIA
-- Before/after photos attached to a maintenance request.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE media_phase AS ENUM ('before', 'after', 'during');

CREATE TABLE maintenance_media (
    id              SERIAL PRIMARY KEY,
    request_id      INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    phase           media_phase DEFAULT 'before',
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),            -- image/jpeg, video/mp4
    file_size_kb    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_request ON maintenance_media(request_id);


-- ─────────────────────────────────────────────────────────────
-- 9. JOB TIME LOGS
-- Track when a technician starts and ends a job.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE job_time_logs (
    id              SERIAL PRIMARY KEY,
    request_id      INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_minutes INTEGER,              -- computed on complete
    tenant_signature TEXT,                 -- Base64 signature image
    notes           TEXT
);


-- ─────────────────────────────────────────────────────────────
-- 10. COMPLAINTS
-- Tenant complaints with optional anonymous submission.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE complaint_status AS ENUM ('open', 'in_review', 'resolved', 'closed');
CREATE TYPE complaint_category AS ENUM (
    'noise', 'parking', 'cleanliness', 'neighbor', 'management',
    'security', 'facilities', 'other'
);

CREATE TABLE complaints (
    id              SERIAL PRIMARY KEY,
    ticket_number   VARCHAR(20) UNIQUE,     -- e.g. CMP-0042
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES users(id),  -- NULL if anonymous
    villa_id        INTEGER REFERENCES villas(id),

    category        complaint_category DEFAULT 'other',
    status          complaint_status DEFAULT 'open',
    is_anonymous    BOOLEAN DEFAULT false,
    subject         VARCHAR(300) NOT NULL,
    description     TEXT,
    attachments     TEXT[],                 -- array of file URLs

    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE complaint_ticket_seq START 1000;

CREATE OR REPLACE FUNCTION set_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'CMP-' || LPAD(NEXTVAL('complaint_ticket_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_ticket_number
    BEFORE INSERT ON complaints
    FOR EACH ROW EXECUTE FUNCTION set_complaint_number();

CREATE INDEX idx_complaints_compound ON complaints(compound_id);
CREATE INDEX idx_complaints_status ON complaints(status);


-- ─────────────────────────────────────────────────────────────
-- 11. COMPLAINT REPLIES
-- Threaded conversation between admin and tenant.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE complaint_replies (
    id              SERIAL PRIMARY KEY,
    complaint_id    INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sent_by         UUID NOT NULL REFERENCES users(id),
    message         TEXT NOT NULL,
    attachments     TEXT[],
    is_internal     BOOLEAN DEFAULT false,  -- internal admin notes
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_complaint ON complaint_replies(complaint_id);


-- ─────────────────────────────────────────────────────────────
-- 12. INVOICES
-- Monthly rent invoices generated per active lease.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'partial');

CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(20) UNIQUE,     -- e.g. INV-2045
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    lease_id        INTEGER NOT NULL REFERENCES leases(id),
    tenant_id       UUID NOT NULL REFERENCES users(id),
    villa_id        INTEGER NOT NULL REFERENCES villas(id),

    -- Billing period
    billing_month   SMALLINT NOT NULL,       -- 1-12
    billing_year    SMALLINT NOT NULL,
    due_date        DATE NOT NULL,
    status          invoice_status DEFAULT 'pending',

    -- Amounts
    rent_amount     DECIMAL(10,2) NOT NULL,
    late_fee        DECIMAL(10,2) DEFAULT 0,
    discount        DECIMAL(10,2) DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    paid_amount     DECIMAL(10,2) DEFAULT 0,

    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE invoice_seq START 1000;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_compound ON invoices(compound_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);


-- ─────────────────────────────────────────────────────────────
-- 13. PAYMENTS
-- Actual payment transactions against invoices.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'check', 'online', 'other');

CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    receipt_number  VARCHAR(20) UNIQUE,     -- e.g. REC-0001
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    invoice_id      INTEGER NOT NULL REFERENCES invoices(id),
    tenant_id       UUID NOT NULL REFERENCES users(id),

    amount          DECIMAL(10,2) NOT NULL,
    payment_method  payment_method DEFAULT 'cash',
    payment_date    DATE NOT NULL,
    reference_no    VARCHAR(100),           -- bank ref, check no, etc.
    notes           TEXT,
    receipt_url     TEXT,                   -- generated PDF URL

    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE receipt_seq START 1000;

CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.receipt_number := 'REC-' || LPAD(NEXTVAL('receipt_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipt_number
    BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION set_receipt_number();

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);


-- ─────────────────────────────────────────────────────────────
-- 14. ANNOUNCEMENTS
-- Compound-wide broadcasts sent to all or specific tenants.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE announcement_type AS ENUM (
    'general', 'maintenance', 'payment', 'emergency', 'event', 'policy'
);

CREATE TABLE announcements (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),

    title           VARCHAR(300) NOT NULL,
    title_ar        VARCHAR(300),
    body            TEXT NOT NULL,
    body_ar         TEXT,
    type            announcement_type DEFAULT 'general',

    -- Targeting
    target_all      BOOLEAN DEFAULT true,
    target_villas   INTEGER[],              -- specific villa IDs if not all

    -- Push notification
    push_sent       BOOLEAN DEFAULT false,
    push_sent_at    TIMESTAMPTZ,
    push_count      INTEGER DEFAULT 0,

    attachments     TEXT[],
    is_pinned       BOOLEAN DEFAULT false,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_compound ON announcements(compound_id);
CREATE INDEX idx_announcements_type ON announcements(type);


-- ─────────────────────────────────────────────────────────────
-- 15. BUS ROUTES
-- School bus routes within the compound.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE bus_routes (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    route_name      VARCHAR(100) NOT NULL,
    driver_name     VARCHAR(200),
    driver_phone    VARCHAR(20),
    vehicle_plate   VARCHAR(20),
    departure_time  TIME,
    return_time     TIME,
    school_name     VARCHAR(200),
    max_capacity    SMALLINT DEFAULT 20,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 16. BUS ENROLLMENTS
-- Which child is on which bus route.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE enrollment_status AS ENUM ('active', 'inactive', 'pending');

CREATE TABLE bus_enrollments (
    id              SERIAL PRIMARY KEY,
    route_id        INTEGER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    dependent_id    INTEGER NOT NULL REFERENCES dependents(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES users(id),
    status          enrollment_status DEFAULT 'pending',
    seat_number     SMALLINT,
    notes           TEXT,
    enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(route_id, dependent_id)
);

CREATE INDEX idx_enrollments_route ON bus_enrollments(route_id);
CREATE INDEX idx_enrollments_tenant ON bus_enrollments(tenant_id);


-- ─────────────────────────────────────────────────────────────
-- 17. NOTIFICATIONS
-- In-app notification log for all users.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
    'maintenance_update', 'payment_due', 'payment_received', 'complaint_reply',
    'announcement', 'assignment', 'system', 'emergency'
);

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    compound_id     INTEGER REFERENCES compounds(id),

    type            notification_type DEFAULT 'system',
    title           VARCHAR(300) NOT NULL,
    body            TEXT,
    data            JSONB DEFAULT '{}'::jsonb,  -- extra payload (link, id, etc.)
    is_read         BOOLEAN DEFAULT false,
    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);


-- ─────────────────────────────────────────────────────────────
-- 18. EMAIL TEMPLATES
-- Configurable HTML email templates per event type.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE email_templates (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    event_key       VARCHAR(100) NOT NULL,   -- e.g. 'payment_reminder', 'welcome'
    subject         VARCHAR(300) NOT NULL,
    body_html       TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(compound_id, event_key)
);


-- ─────────────────────────────────────────────────────────────
-- 19. SUPPORT TICKETS
-- The built-in support / credits system for the SaaS.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE support_tickets (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER REFERENCES compounds(id),
    created_by      UUID REFERENCES users(id),
    subject         VARCHAR(300) NOT NULL,
    description     TEXT,
    priority        support_priority DEFAULT 'medium',
    status          support_status DEFAULT 'open',
    response        TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 20. AUDIT LOG
-- Immutable trail of all significant system actions.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    compound_id     INTEGER REFERENCES compounds(id),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,   -- e.g. 'PAYMENT_RECORDED'
    entity_type     VARCHAR(50),             -- e.g. 'invoice'
    entity_id       VARCHAR(50),             -- the affected record ID
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_compound ON audit_log(compound_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 21. FACILITIES
-- Compound amenities that tenants can book (gym, pool, hall, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TYPE facility_category AS ENUM ('gym', 'pool', 'event_hall', 'sports', 'clubhouse', 'playground', 'other');

CREATE TABLE facilities (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,

    name            VARCHAR(200) NOT NULL,
    name_ar         VARCHAR(200),
    description     TEXT,
    category        facility_category DEFAULT 'other',

    images          TEXT[],                  -- array of image URLs
    max_capacity    SMALLINT DEFAULT 1,
    opening_time    TIME,
    closing_time    TIME,
    is_active       BOOLEAN DEFAULT true,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facilities_compound ON facilities(compound_id);

-- ─────────────────────────────────────────────────────────────
-- 22. FACILITY BOOKINGS
-- Tenant bookings for facilities.
-- ─────────────────────────────────────────────────────────────
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE facility_bookings (
    id              SERIAL PRIMARY KEY,
    compound_id     INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    facility_id     INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES users(id),

    booking_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    status          booking_status DEFAULT 'confirmed',
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fb_facility ON facility_bookings(facility_id);
CREATE INDEX idx_fb_tenant ON facility_bookings(tenant_id);
CREATE INDEX idx_fb_date ON facility_bookings(booking_date);

-- ─────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_villas_updated_at
    BEFORE UPDATE ON villas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_maintenance_updated_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_facilities_updated_at
    BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- When a payment is recorded, update the invoice paid_amount and status
CREATE OR REPLACE FUNCTION sync_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    total_paid    DECIMAL(10,2);
    inv_total     DECIMAL(10,2);
BEGIN
    -- Sum all payments for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments WHERE invoice_id = NEW.invoice_id;

    SELECT total_amount INTO inv_total
    FROM invoices WHERE id = NEW.invoice_id;

    -- Update invoice
    UPDATE invoices SET
        paid_amount = total_paid,
        status = CASE
            WHEN total_paid >= inv_total THEN 'paid'::invoice_status
            WHEN total_paid > 0 THEN 'partial'::invoice_status
            ELSE 'pending'::invoice_status
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_invoice_on_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION sync_invoice_on_payment();

-- When maintenance is completed, set completed_at
CREATE OR REPLACE FUNCTION set_maintenance_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_completed_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION set_maintenance_completed_at();

-- Mark villa status when lease changes
CREATE OR REPLACE FUNCTION sync_villa_status_on_lease()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE villas SET status = 'occupied'::villa_status WHERE id = NEW.villa_id;
    ELSIF NEW.status IN ('expired', 'terminated') THEN
        UPDATE villas SET status = 'vacant'::villa_status WHERE id = NEW.villa_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_villa_on_lease
    AFTER INSERT OR UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION sync_villa_status_on_lease();


-- ─────────────────────────────────────────────────────────────
-- VIEWS (Useful query shortcuts)
-- ─────────────────────────────────────────────────────────────

-- Active leases with tenant and villa info
CREATE OR REPLACE VIEW v_active_leases AS
SELECT
    l.id            AS lease_id,
    l.compound_id,
    v.unit_number,
    v.block,
    u.full_name     AS tenant_name,
    u.phone         AS tenant_phone,
    u.email         AS tenant_email,
    l.start_date,
    l.end_date,
    l.monthly_rent,
    l.status
FROM leases l
JOIN villas v ON l.villa_id = v.id
JOIN users u ON l.tenant_id = u.id
WHERE l.status = 'active';

-- Maintenance dashboard view
CREATE OR REPLACE VIEW v_maintenance_summary AS
SELECT
    compound_id,
    COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
    COUNT(*) FILTER (WHERE status = 'assigned')  AS assigned,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE priority = 'emergency') AS emergency_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)
        FILTER (WHERE status = 'completed') AS avg_resolution_hours
FROM maintenance_requests
GROUP BY compound_id;

-- Financial snapshot view
CREATE OR REPLACE VIEW v_financial_snapshot AS
SELECT
    i.compound_id,
    i.billing_month,
    i.billing_year,
    COUNT(*) AS total_invoices,
    SUM(i.total_amount) AS total_expected,
    SUM(i.paid_amount) AS total_collected,
    SUM(i.total_amount - i.paid_amount) AS outstanding,
    COUNT(*) FILTER (WHERE i.status = 'overdue') AS overdue_count
FROM invoices i
GROUP BY i.compound_id, i.billing_month, i.billing_year;
