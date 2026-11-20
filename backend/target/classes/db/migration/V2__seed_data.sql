-- =============================================================================
-- LegalConnect - Phase 2: Seed Data (Flyway V2)
-- Demo password for all seeded accounts: Password@123 (BCrypt cost 10)
-- =============================================================================

INSERT INTO legal_specializations (name, slug, description) VALUES
('Family & Matrimonial Law', 'family-matrimonial', 'Divorce, custody, maintenance, and mediated family settlements.'),
('Property & Real Estate', 'property-real-estate', 'Title verification, RERA disputes, lease agreements, and land registration.'),
('Consumer Protection', 'consumer-protection', 'Consumer forum representation, defective goods, and service deficiency claims.'),
('Corporate & Commercial', 'corporate-commercial', 'Contract drafting, startup compliance, M&A advisory, and commercial arbitration.'),
('Cyber Law & IP', 'cyber-law-ip', 'Data privacy, IT Act remedies, trademark registration, and copyright disputes.'),
('Criminal Defense & Bail', 'criminal-defense-bail', 'Anticipatory bail, FIR quashing, trial representation, and legal aid defense.'),
('Arbitration & Mediation', 'arbitration-mediation', 'Alternative dispute resolution, institutional arbitration, and commercial mediation.'),
('Notary & Documentation', 'notary-documentation', 'Affidavits, power of attorney, notarization, and apostille attestation.');

INSERT INTO users (id, email, password_hash, role, status) VALUES
(1, 'admin@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', 'ACTIVE'),
(2, 'arjun.mehta@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', 'ACTIVE'),
(3, 'kavita.nair@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', 'ACTIVE'),
(4, 'meera.deshmukh@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', 'ACTIVE'),
(5, 'rohan.kapoor@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', 'ACTIVE'),
(6, 'sanjay.verma@legalconnect.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'PROVIDER', 'ACTIVE'),
(7, 'ananya.sharma@citizen.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'CITIZEN', 'ACTIVE'),
(8, 'vikram.rao@citizen.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'CITIZEN', 'ACTIVE');

INSERT INTO citizen_profiles (id, user_id, full_name, phone, city, state, preferred_language) VALUES
(1, 7, 'Ananya Sharma', '+91-9820112233', 'Bengaluru', 'Karnataka', 'English'),
(2, 8, 'Vikram Rao', '+91-9845099887', 'Pune', 'Maharashtra', 'Hindi');

INSERT INTO provider_profiles (
    id, user_id, provider_type, full_name, phone, bar_registration_no,
    experience_years, city, state, languages_spoken, bio, avatar_url,
    consultation_fee, verification_status, verified_at, incentive_points,
    incentive_tier, commission_rate_pct, pro_bono_cases_completed, avg_rating, total_reviews, is_accepting_clients
) VALUES
(1, 2, 'ADVOCATE', 'Adv. Arjun Mehta', '+91-9811100221', 'D/1428/2008', 16, 'New Delhi', 'Delhi',
 'English, Hindi', 'Senior civil and real estate counsel practicing before the Delhi High Court and NCDRC with 16 years of property title and RERA litigation experience.',
 '/src/assets/images/provider_portrait_one_1795167919861.jpg',
 1500.00, 'APPROVED', NOW(), 860, 'PLATINUM', 5.00, 12, 4.90, 2, 1),
(2, 3, 'ARBITRATOR', 'Kavita Nair, FCIArb', '+91-9820445512', 'MH/2910/2013', 11, 'Mumbai', 'Maharashtra',
 'English, Malayalam, Marathi', 'Commercial arbitrator and corporate counsel specializing in MSME contract disputes, SaaS agreements, and institutional arbitration.',
 '/src/assets/images/provider_portrait_two_1795167919824.jpg',
 2000.00, 'APPROVED', NOW(), 620, 'GOLD', 8.00, 5, 4.80, 1, 1),
(3, 4, 'MEDIATOR', 'Meera Deshmukh', '+91-9845221190', 'KAR/1842/2011', 13, 'Bengaluru', 'Karnataka',
 'English, Kannada, Hindi', 'Court-annexed family mediator and consumer rights specialist focused on amicable custody agreements and fast-track consumer redressal.',
 '/src/assets/images/provider_portrait_three_1795167918923.jpg',
 900.00, 'APPROVED', NOW(), 410, 'SILVER', 11.00, 8, 4.85, 1, 1),
(4, 5, 'ADVOCATE', 'Adv. Rohan Kapoor', '+91-9876543210', 'MH/4412/2018', 6, 'Pune', 'Maharashtra',
 'English, Hindi', 'Technology, cyber fraud, and intellectual property advocate advising startups and citizens on IT Act filings and trademark enforcement.',
 '/src/assets/images/provider_portrait_four_1795167919995.jpg',
 800.00, 'APPROVED', NOW(), 240, 'BRONZE', 15.00, 2, 4.70, 1, 1),
(5, 6, 'NOTARY', 'Sanjay Verma', '+91-9810998877', 'UP/NOT/7712/2019', 5, 'Lucknow', 'Uttar Pradesh',
 'Hindi, English', 'Public notary and documentation specialist providing verified affidavits, powers of attorney, and rental deed attestation.',
 NULL,
 400.00, 'PENDING_REVIEW', NULL, 60, 'BRONZE', 15.00, 0, 0.00, 0, 1);

INSERT INTO provider_credentials (provider_id, document_type, credential_number, issuing_authority, original_filename, storage_key, verification_status, reviewer_remarks) VALUES
(1, 'BAR_CERTIFICATE', 'D/1428/2008', 'Bar Council of Delhi', 'bcd_sanad_arjun.pdf', 'seed_bcd_arjun.pdf', 'VERIFIED', 'Verified against Bar roll.'),
(2, 'BAR_CERTIFICATE', 'MH/2910/2013', 'Bar Council of Maharashtra & Goa', 'bcmg_kavita.pdf', 'seed_bcmg_kavita.pdf', 'VERIFIED', 'Verified.'),
(3, 'PRACTICE_LICENSE', 'KAR/1842/2011', 'Karnataka Mediation Centre', 'kmc_meera.pdf', 'seed_kmc_meera.pdf', 'VERIFIED', 'Verified.'),
(4, 'BAR_CERTIFICATE', 'MH/4412/2018', 'Bar Council of Maharashtra & Goa', 'bcmg_rohan.pdf', 'seed_bcmg_rohan.pdf', 'VERIFIED', 'Verified.'),
(5, 'PRACTICE_LICENSE', 'UP/NOT/7712/2019', 'Dept of Justice UP', 'notary_sanjay.pdf', 'seed_notary_sanjay.pdf', 'PENDING', NULL);

INSERT INTO provider_services (id, provider_id, specialization_id, title, description, service_mode, fee, duration_minutes, is_pro_bono_eligible, is_active) VALUES
(1, 1, 2, 'Property Title & Sale Deed Due Diligence', 'Comprehensive 30-year chain of title audit, encumbrance review, and RERA compliance opinion.', 'VIDEO', 1500.00, 45, 0, 1),
(2, 1, 3, 'NCDRC / Consumer Complaint Strategy', 'Case merits review and notice drafting for builder delay or financial service deficiency.', 'VIDEO', 1200.00, 30, 1, 1),
(3, 2, 4, 'Commercial Contract & MSA Redline Review', 'Detailed risk audit of SaaS, vendor, or founder shareholder agreements.', 'DOCUMENT_REVIEW', 2000.00, 60, 0, 1),
(4, 2, 7, 'Pre-Arbitration Dispute Assessment', 'Evaluation of arbitration clause enforceability and settlement framing.', 'VIDEO', 2200.00, 45, 0, 1),
(5, 3, 1, 'Family & Custody Mediation Session', 'Structured neutral mediation session to draft mutually acceptable parenting and maintenance terms.', 'VIDEO', 900.00, 45, 1, 1),
(6, 4, 5, 'Cyber Fraud & Bank Lien Unfreeze Consultation', 'Immediate legal guidance for cyber crime portal complaints and Section 102 CrPC/BNSS bank account holds.', 'VIDEO', 800.00, 30, 1, 1);

INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available) VALUES
(1, 'MONDAY', '10:00:00', '17:00:00', 45, 1),
(1, 'WEDNESDAY', '10:00:00', '17:00:00', 45, 1),
(1, 'FRIDAY', '11:00:00', '16:00:00', 45, 1),
(2, 'TUESDAY', '09:30:00', '18:00:00', 60, 1),
(2, 'THURSDAY', '09:30:00', '18:00:00', 60, 1),
(3, 'MONDAY', '10:00:00', '16:00:00', 45, 1),
(3, 'THURSDAY', '10:00:00', '16:00:00', 45, 1),
(4, 'TUESDAY', '11:00:00', '19:00:00', 30, 1),
(4, 'SATURDAY', '10:00:00', '14:00:00', 30, 1);

INSERT INTO appointments (id, appointment_code, citizen_id, provider_id, service_id, scheduled_date, start_time, end_time, mode, status, fee_snapshot, notes, meeting_link) VALUES
(1, 'LC-APT-202601', 1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 12 DAY), '11:00:00', '11:45:00', 'VIDEO', 'COMPLETED', 1500.00, 'Apartment sale agreement title check in Whitefield.', 'https://meet.legalconnect.in/LC-APT-202601'),
(2, 'LC-APT-202602', 2, 3, 5, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '14:00:00', '14:45:00', 'VIDEO', 'COMPLETED', 900.00, 'Initial family mediation consultation.', 'https://meet.legalconnect.in/LC-APT-202602'),
(3, 'LC-APT-202603', 1, 4, 6, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00:00', '15:30:00', 'VIDEO', 'CONFIRMED', 800.00, 'UPI dispute lien guidance.', 'https://meet.legalconnect.in/LC-APT-202603');

INSERT INTO legal_service_requests (id, request_code, citizen_id, assigned_provider_id, specialization_id, title, description, urgency, budget_max, is_pro_bono_requested, status, provider_notes) VALUES
(1, 'LC-REQ-202601', 1, 1, 2, 'Builder Possession Delay & RERA Compensation Notice', 'Builder delayed handover by 14 months beyond RERA deadline. Seeking formal legal notice and compensation computation.', 'HIGH', 5000.00, 0, 'IN_PROGRESS', 'Reviewed allotment letter; drafting Section 18 RERA notice.'),
(2, 'LC-REQ-202602', 2, NULL, 3, 'Insurance Claim Rejection Review', 'Health insurance claim denied on pre-existing clause despite 4-year continuous policy.', 'MEDIUM', 2500.00, 1, 'OPEN', NULL);

INSERT INTO payments (id, transaction_ref, gateway_order_id, gateway_payment_id, citizen_id, provider_id, appointment_id, amount, platform_fee, provider_payout, currency, payment_method, status, receipt_number, paid_at) VALUES
(1, 'TXN-LC-1001', 'order_seed_1001', 'pay_seed_1001', 1, 1, 1, 1500.00, 75.00, 1425.00, 'INR', 'RAZORPAY_TEST', 'PAID', 'RCPT-2026-1001', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(2, 'TXN-LC-1002', 'order_seed_1002', 'pay_seed_1002', 2, 3, 2, 900.00, 99.00, 801.00, 'INR', 'RAZORPAY_TEST', 'PAID', 'RCPT-2026-1002', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 'TXN-LC-1003', 'order_seed_1003', 'pay_seed_1003', 1, 4, 3, 800.00, 120.00, 680.00, 'INR', 'RAZORPAY_TEST', 'PAID', 'RCPT-2026-1003', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO reviews (appointment_id, citizen_id, provider_id, rating, comment, is_visible) VALUES
(1, 1, 1, 5, 'Thorough encumbrance review; spotted a missing NOC clause immediately before signing.', 1),
(2, 2, 3, 5, 'Calm, structured mediation guidance that helped clarify next steps clearly.', 1);

INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read) VALUES
(7, 'APPOINTMENT_CONFIRMED', 'Consultation Confirmed', 'Your consultation LC-APT-202603 with Adv. Rohan Kapoor is confirmed.', 'APPOINTMENT', 3, 0),
(1, 'VERIFICATION_PENDING', 'New Provider Awaiting Review', 'Sanjay Verma submitted Notary credentials for admin verification.', 'PROVIDER', 5, 0);

INSERT INTO admin_audit_logs (admin_user_id, action, target_entity, target_id, details_json, ip_address) VALUES
(1, 'APPROVE_PROVIDER', 'PROVIDER_PROFILE', 1, '{"status":"APPROVED","incentiveTier":"PLATINUM","pointsAwarded":100}', '127.0.0.1'),
(1, 'APPROVE_PROVIDER', 'PROVIDER_PROFILE', 2, '{"status":"APPROVED","incentiveTier":"GOLD","pointsAwarded":100}', '127.0.0.1');
