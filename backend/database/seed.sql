-- ============================================================
-- Compound Management System — Demo Seed Data
-- ============================================================
-- Run AFTER schema.sql:
--   psql -U postgres -d compound_db -f seed.sql
-- ============================================================

-- Clean up any existing data to allow clean re-runs
DO $$
BEGIN
    TRUNCATE TABLE 
        audit_log, support_tickets, email_templates, notifications, 
        bus_enrollments, bus_routes, announcements, payments, invoices, 
        complaint_replies, complaints, job_time_logs, maintenance_media, 
        maintenance_requests, dependents, leases, villas, users, compounds 
        RESTART IDENTITY CASCADE;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Ignore if tables do not exist yet
END $$;

-- ─── Compound ─────────────────────────────────────────────
INSERT INTO compounds (id, name, name_ar, address, city, phone, email)
VALUES (1, 'Al Nakheel Compound', 'كمباوند النخيل', 'King Abdullah Road, Block 7', 'Riyadh', '+966 11 234 5678', 'info@nakheel-compound.sa');

-- ─── Admin User ───────────────────────────────────────────
-- Password: Admin@1234 (bcrypt hash)
INSERT INTO users (id, compound_id, role, full_name, full_name_ar, email, phone, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    1, 'admin',
    'Ahmed Al Mansouri', 'أحمد المنصوري',
    'admin@nakheel-compound.sa', '+966501234567',
    '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO'
);

-- Super Admin
INSERT INTO users (id, compound_id, role, full_name, full_name_ar, email, phone, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    1, 'super_admin',
    'System Administrator', 'مدير النظام',
    'super@nakheel-compound.sa', '+966509999999',
    '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO'
);

-- ─── Staff Users ──────────────────────────────────────────
INSERT INTO users (id, compound_id, role, full_name, full_name_ar, phone, password_hash)
VALUES
    ('00000000-0000-0000-0000-000000000010', 1, 'staff', 'Khalid Al Zahrani', 'خالد الزهراني', '+966501111111', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO'),
    ('00000000-0000-0000-0000-000000000011', 1, 'staff', 'Faisal Al Otaibi', 'فيصل العتيبي', '+966502222222', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO'),
    ('00000000-0000-0000-0000-000000000012', 1, 'staff', 'Omar Al Shehri', 'عمر الشهري', '+966503333333', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO');

-- ─── Tenant Users ─────────────────────────────────────────
INSERT INTO users (id, compound_id, role, full_name, full_name_ar, email, phone, password_hash, national_id, nationality)
VALUES
    ('00000000-0000-0000-0000-000000000020', 1, 'tenant', 'Mohammed Al Harbi', 'محمد الحربي', 'mharbi@email.com', '+966505000001', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO', '1234567890', 'Saudi'),
    ('00000000-0000-0000-0000-000000000021', 1, 'tenant', 'Sara Al Ghamdi', 'سارة الغامدي', 'sghamdi@email.com', '+966505000002', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO', '1234567891', 'Saudi'),
    ('00000000-0000-0000-0000-000000000022', 1, 'tenant', 'Fatima Al Zahrani', 'فاطمة الزهراني', 'fzahrani@email.com', '+966505000003', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO', '1234567892', 'Saudi'),
    ('00000000-0000-0000-0000-000000000023', 1, 'tenant', 'Khalid Al Omari', 'خالد العمري', 'komari@email.com', '+966505000004', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO', '1234567893', 'Saudi'),
    ('00000000-0000-0000-0000-000000000024', 1, 'tenant', 'Nora Al Rashidi', 'نورة الرشيدي', 'nrashidi@email.com', '+966505000005', '$2a$10$B6DE0ReFhI65yVv./BgeIuV90xp33yafk0UtljyreSLm9ChHsGVSO', '1234567894', 'Saudi');

-- ─── Villas ───────────────────────────────────────────────
INSERT INTO villas (id, compound_id, unit_number, block, villa_type, status, area_sqm, bedrooms, bathrooms, monthly_rent, annual_rent)
VALUES
    (1, 1, 'A-01', 'A', 'villa', 'occupied', 350, 5, 4, 4500, 54000),
    (2, 1, 'A-02', 'A', 'villa', 'occupied', 350, 5, 4, 4500, 54000),
    (3, 1, 'A-03', 'A', 'villa', 'vacant',   350, 5, 4, 4500, 54000),
    (4, 1, 'A-04', 'A', 'villa', 'occupied', 280, 4, 3, 3800, 45600),
    (5, 1, 'A-05', 'A', 'villa', 'occupied', 280, 4, 3, 3800, 45600),
    (6, 1, 'B-01', 'B', 'villa', 'occupied', 420, 6, 5, 5500, 66000),
    (7, 1, 'B-02', 'B', 'villa', 'vacant',   420, 6, 5, 5500, 66000),
    (8, 1, 'B-03', 'B', 'villa', 'occupied', 320, 4, 3, 4200, 50400),
    (9, 1, 'B-04', 'B', 'villa', 'occupied', 320, 4, 3, 4200, 50400),
    (10, 1, 'B-05', 'B', 'villa', 'maintenance', 320, 4, 3, 4200, 50400),
    (11, 1, 'C-01', 'C', 'villa', 'occupied', 300, 4, 3, 4000, 48000),
    (12, 1, 'C-02', 'C', 'villa', 'occupied', 300, 4, 3, 4000, 48000),
    (13, 1, 'C-03', 'C', 'villa', 'vacant',   300, 4, 3, 4000, 48000),
    (14, 1, 'D-01', 'D', 'duplex', 'occupied', 250, 3, 2, 3200, 38400),
    (15, 1, 'D-02', 'D', 'duplex', 'occupied', 250, 3, 2, 3200, 38400);

-- Sync the primary key sequence for villas
SELECT setval('villas_id_seq', (SELECT MAX(id) FROM villas));

-- ─── Leases ───────────────────────────────────────────────
INSERT INTO leases (compound_id, villa_id, tenant_id, start_date, end_date, status, monthly_rent, security_deposit, payment_due_day)
VALUES
    (1, 1,  '00000000-0000-0000-0000-000000000020', '2025-01-01', '2026-12-31', 'active', 4500, 9000, 1),
    (1, 2,  '00000000-0000-0000-0000-000000000021', '2025-03-01', '2026-02-28', 'active', 4500, 9000, 1),
    (1, 4,  '00000000-0000-0000-0000-000000000022', '2024-07-01', '2025-06-30', 'active', 3800, 7600, 5),
    (1, 6,  '00000000-0000-0000-0000-000000000023', '2025-06-01', '2026-05-31', 'active', 5500, 11000, 1),
    (1, 14, '00000000-0000-0000-0000-000000000024', '2025-09-01', '2026-08-31', 'active', 3200, 6400, 10);

-- ─── Dependents ───────────────────────────────────────────
INSERT INTO dependents (tenant_id, compound_id, full_name, full_name_ar, relation, date_of_birth, school_name, school_grade)
VALUES
    ('00000000-0000-0000-0000-000000000020', 1, 'Layla Al Harbi', 'ليلى الحربي', 'child', '2015-04-12', 'International School Riyadh', 'Grade 5'),
    ('00000000-0000-0000-0000-000000000020', 1, 'Youssef Al Harbi', 'يوسف الحربي', 'child', '2017-09-20', 'International School Riyadh', 'Grade 3'),
    ('00000000-0000-0000-0000-000000000021', 1, 'Adam Al Ghamdi', 'آدم الغامدي', 'child', '2016-01-15', 'National School', 'Grade 4'),
    ('00000000-0000-0000-0000-000000000023', 1, 'Reem Al Omari', 'ريم العمري', 'spouse', '1990-07-22', NULL, NULL);

-- ─── Maintenance Requests ─────────────────────────────────
INSERT INTO maintenance_requests (compound_id, villa_id, tenant_id, assigned_to, category, priority, status, title, description)
VALUES
    (1, 1, '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'plumbing', 'high', 'in_progress', 'Kitchen sink leak', 'Water leaking under the kitchen sink, creating a puddle on the floor.'),
    (1, 2, '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'electrical', 'medium', 'assigned', 'Bedroom light not working', 'The main bedroom ceiling light stopped working. Replaced the bulb already.'),
    (1, 4, '00000000-0000-0000-0000-000000000022', NULL, 'ac_hvac', 'medium', 'submitted', 'AC making loud noise', 'The AC unit in the living room makes a rattling noise when it runs.'),
    (1, 6, '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000010', 'plumbing', 'emergency', 'completed', 'Main pipe burst', 'Main water pipe burst in the garage causing flooding.'),
    (1, 14, '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000012', 'painting', 'low', 'submitted', 'Wall paint peeling in bathroom', 'Bathroom wall paint is peeling near the shower area.');

-- ─── Complaints ───────────────────────────────────────────
INSERT INTO complaints (compound_id, tenant_id, villa_id, category, status, is_anonymous, subject, description)
VALUES
    (1, '00000000-0000-0000-0000-000000000020', 1, 'noise', 'open', false, 'Loud music from neighboring villa', 'Villa A-02 plays loud music after midnight on weekdays.'),
    (1, NULL, NULL, 'parking', 'in_review', true, 'Visitor parking being misused', 'Several residents are using visitor parking spots as permanent spots.'),
    (1, '00000000-0000-0000-0000-000000000022', 4, 'cleanliness', 'resolved', false, 'Garbage area not cleaned regularly', 'The garbage collection area near Block A is not cleaned often enough.');

-- ─── Invoices ─────────────────────────────────────────────
INSERT INTO invoices (compound_id, lease_id, tenant_id, villa_id, billing_month, billing_year, due_date, status, rent_amount, total_amount, paid_amount)
VALUES
    (1, 1, '00000000-0000-0000-0000-000000000020', 1, 6, 2026, '2026-06-01', 'paid',    4500, 4500, 4500),
    (1, 1, '00000000-0000-0000-0000-000000000020', 1, 7, 2026, '2026-07-01', 'pending', 4500, 4500, 0),
    (1, 2, '00000000-0000-0000-0000-000000000021', 2, 6, 2026, '2026-06-01', 'overdue', 4500, 4500, 0),
    (1, 3, '00000000-0000-0000-0000-000000000022', 4, 6, 2026, '2026-06-01', 'paid',    3800, 3800, 3800),
    (1, 4, '00000000-0000-0000-0000-000000000023', 6, 6, 2026, '2026-06-01', 'overdue', 5500, 5650, 0),
    (1, 5, '00000000-0000-0000-0000-000000000024', 14, 6, 2026, '2026-06-10','pending', 3200, 3200, 0);

-- ─── Payments ─────────────────────────────────────────────
INSERT INTO payments (compound_id, invoice_id, tenant_id, amount, payment_method, payment_date, recorded_by)
VALUES
    (1, 1, '00000000-0000-0000-0000-000000000020', 4500, 'bank_transfer', '2026-06-01', '00000000-0000-0000-0000-000000000001'),
    (1, 4, '00000000-0000-0000-0000-000000000022', 3800, 'cash',          '2026-06-03', '00000000-0000-0000-0000-000000000001');

-- ─── Bus Routes ───────────────────────────────────────────
INSERT INTO bus_routes (compound_id, route_name, driver_name, driver_phone, vehicle_plate, departure_time, return_time, school_name, max_capacity)
VALUES
    (1, 'Route A – International School', 'Abdullah Al Harbi', '+966501010101', 'RYD-1234', '07:00', '14:30', 'International School Riyadh', 20),
    (1, 'Route B – National School', 'Samir Al Qahtani', '+966501020202', 'RYD-5678', '07:15', '14:00', 'National School', 15);

-- ─── Bus Enrollments ──────────────────────────────────────
INSERT INTO bus_enrollments (route_id, dependent_id, tenant_id, status, seat_number)
VALUES
    (1, 1, '00000000-0000-0000-0000-000000000020', 'active', 1),
    (1, 2, '00000000-0000-0000-0000-000000000020', 'active', 2),
    (2, 3, '00000000-0000-0000-0000-000000000021', 'active', 1);

-- ─── Announcements ────────────────────────────────────────
INSERT INTO announcements (compound_id, created_by, title, title_ar, body, body_ar, type, target_all, is_pinned)
VALUES
    (1, '00000000-0000-0000-0000-000000000001',
     'Compound Maintenance Day – July 15',
     'يوم صيانة الكمباوند – 15 يوليو',
     'Dear residents, we will be conducting general maintenance on July 15 from 8 AM to 2 PM. Water will be temporarily cut off.',
     'عزيزي السكان، سيتم إجراء صيانة عامة يوم 15 يوليو من 8 صباحاً حتى 2 مساءً. سيتم قطع المياه مؤقتاً.',
     'maintenance', true, true),
    (1, '00000000-0000-0000-0000-000000000001',
     'New Swimming Pool Hours',
     'مواعيد حمام السباحة الجديدة',
     'Pool hours have been updated: 6 AM – 10 PM daily.',
     'تم تحديث مواعيد حمام السباحة: 6 صباحاً – 10 مساءً يومياً.',
     'general', true, false);

-- ─── Email Templates ──────────────────────────────────────
INSERT INTO email_templates (compound_id, event_key, subject, body_html)
VALUES
    (1, 'payment_reminder',
     'Reminder: Rent Payment Due – {{month}}',
     '<h2>Payment Reminder</h2><p>Dear {{tenant_name}},</p><p>Your rent payment of <strong>SAR {{amount}}</strong> for villa <strong>{{villa}}</strong> is due on <strong>{{due_date}}</strong>.</p><p>Please contact the management office if you need assistance.</p>'),
    (1, 'welcome',
     'Welcome to {{compound_name}}!',
     '<h2>Welcome!</h2><p>Dear {{tenant_name}},</p><p>Your account for {{compound_name}} has been created. Your unit is <strong>{{villa}}</strong>.</p><p>Download our app to manage your requests and payments.</p>'),
    (1, 'maintenance_update',
     'Maintenance Request Update – {{ticket}}',
     '<h2>Request Update</h2><p>Dear {{tenant_name}},</p><p>Your maintenance request <strong>{{ticket}}</strong> status has been updated to: <strong>{{status}}</strong>.</p>');
