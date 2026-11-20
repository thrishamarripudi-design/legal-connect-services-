-- =============================================================================
-- LegalConnect - Phase 2: Normalized MySQL 8 Database Schema (Flyway V1)
-- =============================================================================

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('CITIZEN', 'PROVIDER', 'ADMIN') NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email),
    INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE citizen_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NULL,
    city VARCHAR(80) NULL,
    state VARCHAR(80) NULL,
    preferred_language VARCHAR(40) NOT NULL DEFAULT 'English',
    address_line VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_citizen_user UNIQUE (user_id),
    CONSTRAINT fk_citizen_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_citizen_city (city, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider_type ENUM('ADVOCATE', 'MEDIATOR', 'ARBITRATOR', 'NOTARY', 'LEGAL_CONSULTANT') NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    bar_registration_no VARCHAR(80) NULL,
    experience_years INT NOT NULL DEFAULT 0,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    languages_spoken VARCHAR(200) NOT NULL DEFAULT 'English, Hindi',
    bio TEXT NULL,
    avatar_url VARCHAR(500) NULL,
    consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    verification_status ENUM('DRAFT', 'PENDING_REVIEW', 'CORRECTIONS_REQUIRED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    verification_remarks VARCHAR(500) NULL,
    verified_at DATETIME NULL,
    incentive_points INT NOT NULL DEFAULT 0,
    incentive_tier ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NOT NULL DEFAULT 'BRONZE',
    commission_rate_pct DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    pro_bono_cases_completed INT NOT NULL DEFAULT 0,
    avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    total_reviews INT NOT NULL DEFAULT 0,
    is_accepting_clients TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_provider_user UNIQUE (user_id),
    CONSTRAINT uk_provider_bar_reg UNIQUE (bar_registration_no),
    CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_provider_exp CHECK (experience_years >= 0),
    CONSTRAINT chk_provider_fee CHECK (consultation_fee >= 0),
    INDEX idx_provider_marketplace (verification_status, is_accepting_clients, city, consultation_fee),
    INDEX idx_provider_tier_rating (incentive_tier, avg_rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_credentials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    document_type ENUM('BAR_CERTIFICATE', 'DEGREE', 'GOVT_ID', 'PRACTICE_LICENSE') NOT NULL,
    credential_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(160) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED', 'CORRECTIONS_REQUIRED') NOT NULL DEFAULT 'PENDING',
    reviewer_remarks VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cred_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    INDEX idx_cred_provider_status (provider_id, verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE legal_specializations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_spec_name UNIQUE (name),
    CONSTRAINT uk_spec_slug UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    specialization_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    service_mode ENUM('VIDEO', 'IN_PERSON', 'PHONE', 'DOCUMENT_REVIEW') NOT NULL DEFAULT 'VIDEO',
    fee DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    is_pro_bono_eligible TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_service_spec FOREIGN KEY (specialization_id) REFERENCES legal_specializations(id) ON DELETE RESTRICT,
    CONSTRAINT chk_service_fee CHECK (fee >= 0),
    CONSTRAINT chk_service_duration CHECK (duration_minutes BETWEEN 15 AND 240),
    INDEX idx_service_search (specialization_id, is_active, fee),
    INDEX idx_service_provider (provider_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_availability (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_provider_day UNIQUE (provider_id, day_of_week),
    CONSTRAINT fk_avail_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_avail_times CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(32) NOT NULL,
    citizen_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode ENUM('VIDEO', 'IN_PERSON', 'PHONE', 'DOCUMENT_REVIEW') NOT NULL,
    status ENUM('REQUESTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED') NOT NULL DEFAULT 'REQUESTED',
    fee_snapshot DECIMAL(10, 2) NOT NULL,
    notes TEXT NULL,
    cancellation_reason VARCHAR(500) NULL,
    meeting_link VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_appt_code UNIQUE (appointment_code),
    CONSTRAINT fk_appt_citizen FOREIGN KEY (citizen_id) REFERENCES citizen_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_service FOREIGN KEY (service_id) REFERENCES provider_services(id) ON DELETE RESTRICT,
    INDEX idx_appt_conflict_lookup (provider_id, scheduled_date, start_time, end_time, status),
    INDEX idx_appt_citizen (citizen_id, status, scheduled_date DESC),
    INDEX idx_appt_provider (provider_id, status, scheduled_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE legal_service_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_code VARCHAR(32) NOT NULL,
    citizen_id BIGINT NOT NULL,
    assigned_provider_id BIGINT NULL,
    specialization_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    budget_max DECIMAL(10, 2) NULL,
    is_pro_bono_requested TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    provider_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_req_code UNIQUE (request_code),
    CONSTRAINT fk_req_citizen FOREIGN KEY (citizen_id) REFERENCES citizen_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_req_provider FOREIGN KEY (assigned_provider_id) REFERENCES provider_profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_req_spec FOREIGN KEY (specialization_id) REFERENCES legal_specializations(id) ON DELETE RESTRICT,
    INDEX idx_req_citizen (citizen_id, status),
    INDEX idx_req_provider (assigned_provider_id, status),
    INDEX idx_req_open_spec (status, specialization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uploaded_by_user_id BIGINT NOT NULL,
    appointment_id BIGINT NULL,
    service_request_id BIGINT NULL,
    document_title VARCHAR(160) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_req FOREIGN KEY (service_request_id) REFERENCES legal_service_requests(id) ON DELETE CASCADE,
    INDEX idx_doc_appt (appointment_id),
    INDEX idx_doc_req (service_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(64) NOT NULL,
    gateway_order_id VARCHAR(100) NOT NULL,
    gateway_payment_id VARCHAR(100) NULL,
    citizen_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    appointment_id BIGINT NULL,
    service_request_id BIGINT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    provider_payout DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(40) NOT NULL DEFAULT 'RAZORPAY_TEST',
    status ENUM('CREATED', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    receipt_number VARCHAR(64) NULL,
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_payment_tx_ref UNIQUE (transaction_ref),
    CONSTRAINT uk_payment_order_id UNIQUE (gateway_order_id),
    CONSTRAINT uk_payment_receipt UNIQUE (receipt_number),
    CONSTRAINT fk_payment_citizen FOREIGN KEY (citizen_id) REFERENCES citizen_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_payment_req FOREIGN KEY (service_request_id) REFERENCES legal_service_requests(id) ON DELETE SET NULL,
    INDEX idx_payment_citizen (citizen_id, status),
    INDEX idx_payment_provider (provider_id, status),
    INDEX idx_payment_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    citizen_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    rating INT NOT NULL,
    comment TEXT NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_review_appt UNIQUE (appointment_id),
    CONSTRAINT fk_review_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_citizen FOREIGN KEY (citizen_id) REFERENCES citizen_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    INDEX idx_review_provider (provider_id, is_visible, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT NOT NULL,
    action VARCHAR(80) NOT NULL,
    target_entity VARCHAR(60) NOT NULL,
    target_id BIGINT NOT NULL,
    details_json TEXT NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_audit_created (created_at DESC),
    INDEX idx_audit_target (target_entity, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
