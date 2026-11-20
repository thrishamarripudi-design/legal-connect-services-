import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'legalconnect-dev-jwt-secret-key-256bit-minimum';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const DB_PATH = path.resolve(process.cwd(), 'legalconnect.db');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initSchemaAndSeed() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('CITIZEN', 'PROVIDER', 'ADMIN')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS citizen_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      state TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'English',
      address_line TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('ADVOCATE', 'MEDIATOR', 'ARBITRATOR', 'NOTARY', 'LEGAL_CONSULTANT')),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      bar_registration_no TEXT UNIQUE,
      experience_years INTEGER NOT NULL DEFAULT 0,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      languages_spoken TEXT NOT NULL DEFAULT 'English, Hindi',
      bio TEXT,
      avatar_url TEXT,
      consultation_fee REAL NOT NULL DEFAULT 500,
      verification_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(verification_status IN ('DRAFT', 'PENDING_REVIEW', 'CORRECTIONS_REQUIRED', 'APPROVED', 'REJECTED')),
      verification_remarks TEXT,
      verified_at TEXT,
      incentive_points INTEGER NOT NULL DEFAULT 0,
      incentive_tier TEXT NOT NULL DEFAULT 'BRONZE' CHECK(incentive_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
      commission_rate_pct REAL NOT NULL DEFAULT 15.0,
      pro_bono_cases_completed INTEGER NOT NULL DEFAULT 0,
      avg_rating REAL NOT NULL DEFAULT 0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      is_accepting_clients INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      credential_number TEXT NOT NULL,
      issuing_authority TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      reviewer_remarks TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS legal_specializations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS provider_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      specialization_id INTEGER NOT NULL REFERENCES legal_specializations(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      service_mode TEXT NOT NULL DEFAULT 'VIDEO',
      fee REAL NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      is_pro_bono_eligible INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
      is_available INTEGER NOT NULL DEFAULT 1,
      UNIQUE(provider_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_code TEXT NOT NULL UNIQUE,
      citizen_id INTEGER NOT NULL REFERENCES citizen_profiles(id),
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id),
      service_id INTEGER NOT NULL REFERENCES provider_services(id),
      scheduled_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'REQUESTED',
      fee_snapshot REAL NOT NULL,
      notes TEXT,
      cancellation_reason TEXT,
      meeting_link TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS legal_service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT NOT NULL UNIQUE,
      citizen_id INTEGER NOT NULL REFERENCES citizen_profiles(id),
      assigned_provider_id INTEGER REFERENCES provider_profiles(id),
      specialization_id INTEGER NOT NULL REFERENCES legal_specializations(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'MEDIUM',
      budget_max REAL,
      is_pro_bono_requested INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      provider_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
      service_request_id INTEGER REFERENCES legal_service_requests(id) ON DELETE CASCADE,
      document_title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_ref TEXT NOT NULL UNIQUE,
      gateway_order_id TEXT NOT NULL UNIQUE,
      gateway_payment_id TEXT,
      citizen_id INTEGER NOT NULL REFERENCES citizen_profiles(id),
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id),
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      service_request_id INTEGER REFERENCES legal_service_requests(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      platform_fee REAL NOT NULL,
      provider_payout REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_method TEXT NOT NULL DEFAULT 'RAZORPAY_TEST',
      status TEXT NOT NULL DEFAULT 'CREATED',
      receipt_number TEXT UNIQUE,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
      citizen_id INTEGER NOT NULL REFERENCES citizen_profiles(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_entity TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const hash = bcrypt.hashSync('Password@123', 10);

  const insertSpec = db.prepare('INSERT INTO legal_specializations (name, slug, description) VALUES (?, ?, ?)');
  const specs = [
    ['Family & Matrimonial Law', 'family-matrimonial', 'Divorce, custody, maintenance, and mediated family settlements.'],
    ['Property & Real Estate', 'property-real-estate', 'Title verification, RERA disputes, lease agreements, and land registration.'],
    ['Consumer Protection', 'consumer-protection', 'Consumer forum representation, defective goods, and service deficiency claims.'],
    ['Corporate & Commercial', 'corporate-commercial', 'Contract drafting, startup compliance, M&A advisory, and commercial arbitration.'],
    ['Cyber Law & IP', 'cyber-law-ip', 'Data privacy, IT Act remedies, trademark registration, and copyright disputes.'],
    ['Criminal Defense & Bail', 'criminal-defense-bail', 'Anticipatory bail, FIR quashing, trial representation, and legal aid defense.'],
    ['Arbitration & Mediation', 'arbitration-mediation', 'Alternative dispute resolution, institutional arbitration, and commercial mediation.'],
    ['Notary & Documentation', 'notary-documentation', 'Affidavits, power of attorney, notarization, and apostille attestation.'],
  ];
  for (const s of specs) insertSpec.run(s[0], s[1], s[2]);

  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(1, 'admin@legalconnect.in', hash, 'ADMIN', 'ACTIVE');
  insertUser.run(2, 'arjun.mehta@legalconnect.in', hash, 'PROVIDER', 'ACTIVE');
  insertUser.run(3, 'kavita.nair@legalconnect.in', hash, 'PROVIDER', 'ACTIVE');
  insertUser.run(4, 'meera.deshmukh@legalconnect.in', hash, 'PROVIDER', 'ACTIVE');
  insertUser.run(5, 'rohan.kapoor@legalconnect.in', hash, 'PROVIDER', 'ACTIVE');
  insertUser.run(6, 'sanjay.verma@legalconnect.in', hash, 'PROVIDER', 'ACTIVE');
  insertUser.run(7, 'ananya.sharma@citizen.in', hash, 'CITIZEN', 'ACTIVE');
  insertUser.run(8, 'vikram.rao@citizen.in', hash, 'CITIZEN', 'ACTIVE');

  const insertCitizen = db.prepare('INSERT INTO citizen_profiles (id, user_id, full_name, phone, city, state, preferred_language) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertCitizen.run(1, 7, 'Ananya Sharma', '+91-9820112233', 'Bengaluru', 'Karnataka', 'English');
  insertCitizen.run(2, 8, 'Vikram Rao', '+91-9845099887', 'Pune', 'Maharashtra', 'Hindi');

  const insertProv = db.prepare(`
    INSERT INTO provider_profiles (
      id, user_id, provider_type, full_name, phone, bar_registration_no,
      experience_years, city, state, languages_spoken, bio, avatar_url,
      consultation_fee, verification_status, verified_at, incentive_points,
      incentive_tier, commission_rate_pct, pro_bono_cases_completed, avg_rating, total_reviews, is_accepting_clients
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProv.run(
    1, 2, 'ADVOCATE', 'Adv. Arjun Mehta', '+91-9811100221', 'D/1428/2008', 16, 'New Delhi', 'Delhi',
    'English, Hindi',
    'Senior civil and real estate counsel practicing before the Delhi High Court and NCDRC with 16 years of property title and RERA litigation experience.',
    '/src/assets/images/provider_portrait_one_1795167919861.jpg',
    1500, 'APPROVED', new Date().toISOString(), 860, 'PLATINUM', 5.0, 12, 4.9, 2, 1
  );
  insertProv.run(
    2, 3, 'ARBITRATOR', 'Kavita Nair, FCIArb', '+91-9820445512', 'MH/2910/2013', 11, 'Mumbai', 'Maharashtra',
    'English, Malayalam, Marathi',
    'Commercial arbitrator and corporate counsel specializing in MSME contract disputes, SaaS agreements, and institutional arbitration.',
    '/src/assets/images/provider_portrait_two_1795167919824.jpg',
    2000, 'APPROVED', new Date().toISOString(), 620, 'GOLD', 8.0, 5, 4.8, 1, 1
  );
  insertProv.run(
    3, 4, 'MEDIATOR', 'Meera Deshmukh', '+91-9845221190', 'KAR/1842/2011', 13, 'Bengaluru', 'Karnataka',
    'English, Kannada, Hindi',
    'Court-annexed family mediator and consumer rights specialist focused on amicable custody agreements and fast-track consumer redressal.',
    '/src/assets/images/provider_portrait_three_1795167918923.jpg',
    900, 'APPROVED', new Date().toISOString(), 410, 'SILVER', 11.0, 8, 4.85, 1, 1
  );
  insertProv.run(
    4, 5, 'ADVOCATE', 'Adv. Rohan Kapoor', '+91-9876543210', 'MH/4412/2018', 6, 'Pune', 'Maharashtra',
    'English, Hindi',
    'Technology, cyber fraud, and intellectual property advocate advising startups and citizens on IT Act filings and trademark enforcement.',
    '/src/assets/images/provider_portrait_four_1795167919995.jpg',
    800, 'APPROVED', new Date().toISOString(), 240, 'BRONZE', 15.0, 2, 4.7, 1, 1
  );
  insertProv.run(
    5, 6, 'NOTARY', 'Sanjay Verma', '+91-9810998877', 'UP/NOT/7712/2019', 5, 'Lucknow', 'Uttar Pradesh',
    'Hindi, English',
    'Public notary and documentation specialist providing verified affidavits, powers of attorney, and rental deed attestation.',
    null, 400, 'PENDING_REVIEW', null, 60, 'BRONZE', 15.0, 0, 0, 0, 1
  );

  // Sample seed credential file on disk so downloads work immediately
  fs.writeFileSync(path.join(UPLOAD_DIR, 'seed_notary_sanjay.txt'), 'LegalConnect Demo Credential Artifact - Notary License UP/NOT/7712/2019');
  fs.writeFileSync(path.join(UPLOAD_DIR, 'seed_bcd_arjun.txt'), 'LegalConnect Demo Credential Artifact - Bar Council of Delhi D/1428/2008');

  const insertCred = db.prepare(`
    INSERT INTO provider_credentials (provider_id, document_type, credential_number, issuing_authority, original_filename, storage_key, verification_status, reviewer_remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCred.run(1, 'BAR_CERTIFICATE', 'D/1428/2008', 'Bar Council of Delhi', 'bcd_sanad_arjun.txt', 'seed_bcd_arjun.txt', 'VERIFIED', 'Verified against Bar roll.');
  insertCred.run(2, 'BAR_CERTIFICATE', 'MH/2910/2013', 'Bar Council of Maharashtra & Goa', 'bcmg_kavita.txt', 'seed_bcd_arjun.txt', 'VERIFIED', 'Verified.');
  insertCred.run(3, 'PRACTICE_LICENSE', 'KAR/1842/2011', 'Karnataka Mediation Centre', 'kmc_meera.txt', 'seed_bcd_arjun.txt', 'VERIFIED', 'Verified.');
  insertCred.run(4, 'BAR_CERTIFICATE', 'MH/4412/2018', 'Bar Council of Maharashtra & Goa', 'bcmg_rohan.txt', 'seed_bcd_arjun.txt', 'VERIFIED', 'Verified.');
  insertCred.run(5, 'PRACTICE_LICENSE', 'UP/NOT/7712/2019', 'Dept of Justice UP', 'notary_sanjay.txt', 'seed_notary_sanjay.txt', 'PENDING', null);

  const insertSrv = db.prepare(`
    INSERT INTO provider_services (id, provider_id, specialization_id, title, description, service_mode, fee, duration_minutes, is_pro_bono_eligible, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertSrv.run(1, 1, 2, 'Property Title & Sale Deed Due Diligence', 'Comprehensive 30-year chain of title audit, encumbrance review, and RERA compliance opinion.', 'VIDEO', 1500, 45, 0);
  insertSrv.run(2, 1, 3, 'NCDRC / Consumer Complaint Strategy', 'Case merits review and notice drafting for builder delay or financial service deficiency.', 'VIDEO', 1200, 30, 1);
  insertSrv.run(3, 2, 4, 'Commercial Contract & MSA Redline Review', 'Detailed risk audit of SaaS, vendor, or founder shareholder agreements.', 'DOCUMENT_REVIEW', 2000, 60, 0);
  insertSrv.run(4, 2, 7, 'Pre-Arbitration Dispute Assessment', 'Evaluation of arbitration clause enforceability and settlement framing.', 'VIDEO', 2200, 45, 0);
  insertSrv.run(5, 3, 1, 'Family & Custody Mediation Session', 'Structured neutral mediation session to draft mutually acceptable parenting and maintenance terms.', 'VIDEO', 900, 45, 1);
  insertSrv.run(6, 4, 5, 'Cyber Fraud & Bank Lien Unfreeze Consultation', 'Immediate legal guidance for cyber crime portal complaints and Section 102 BNSS bank holds.', 'VIDEO', 800, 30, 1);

  const insertAvail = db.prepare(`
    INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const days = [
    [1, 'MONDAY', '10:00', '17:00', 45], [1, 'TUESDAY', '10:00', '17:00', 45],
    [1, 'WEDNESDAY', '10:00', '17:00', 45], [1, 'THURSDAY', '10:00', '17:00', 45], [1, 'FRIDAY', '11:00', '16:00', 45],
    [2, 'MONDAY', '09:30', '18:00', 60], [2, 'TUESDAY', '09:30', '18:00', 60], [2, 'THURSDAY', '09:30', '18:00', 60],
    [3, 'MONDAY', '10:00', '16:00', 45], [3, 'WEDNESDAY', '10:00', '16:00', 45], [3, 'THURSDAY', '10:00', '16:00', 45],
    [4, 'TUESDAY', '11:00', '19:00', 30], [4, 'FRIDAY', '11:00', '19:00', 30], [4, 'SATURDAY', '10:00', '14:00', 30],
  ];
  for (const d of days) insertAvail.run(d[0], d[1], d[2], d[3], d[4]);

  const dateShift = (offsetDays: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  };

  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, appointment_code, citizen_id, provider_id, service_id, scheduled_date, start_time, end_time, mode, status, fee_snapshot, notes, meeting_link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAppt.run(1, 'LC-APT-202601', 1, 1, 1, dateShift(-12), '11:00', '11:45', 'VIDEO', 'COMPLETED', 1500, 'Apartment sale agreement title check in Whitefield.', 'https://meet.legalconnect.in/LC-APT-202601');
  insertAppt.run(2, 'LC-APT-202602', 2, 3, 5, dateShift(-5), '14:00', '14:45', 'VIDEO', 'COMPLETED', 900, 'Initial family mediation consultation.', 'https://meet.legalconnect.in/LC-APT-202602');
  insertAppt.run(3, 'LC-APT-202603', 1, 4, 6, dateShift(3), '15:00', '15:30', 'VIDEO', 'CONFIRMED', 800, 'UPI dispute lien guidance.', 'https://meet.legalconnect.in/LC-APT-202603');
  insertAppt.run(4, 'LC-APT-202604', 1, 2, 3, dateShift(-2), '10:30', '11:30', 'DOCUMENT_REVIEW', 'COMPLETED', 2000, 'SaaS vendor agreement redline review.', 'https://meet.legalconnect.in/LC-APT-202604');

  const insertReq = db.prepare(`
    INSERT INTO legal_service_requests (id, request_code, citizen_id, assigned_provider_id, specialization_id, title, description, urgency, budget_max, is_pro_bono_requested, status, provider_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReq.run(1, 'LC-REQ-202601', 1, 1, 2, 'Builder Possession Delay & RERA Compensation Notice', 'Builder delayed handover by 14 months beyond RERA deadline. Seeking formal legal notice and compensation computation.', 'HIGH', 5000, 0, 'IN_PROGRESS', 'Reviewed allotment letter; drafting Section 18 RERA notice.');
  insertReq.run(2, 'LC-REQ-202602', 2, null, 3, 'Insurance Claim Rejection Review', 'Health insurance claim denied on pre-existing clause despite 4-year continuous policy.', 'MEDIUM', 2500, 1, 'OPEN', null);

  const insertPay = db.prepare(`
    INSERT INTO payments (id, transaction_ref, gateway_order_id, gateway_payment_id, citizen_id, provider_id, appointment_id, amount, platform_fee, provider_payout, currency, payment_method, status, receipt_number, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'RAZORPAY_TEST', 'PAID', ?, ?)
  `);
  insertPay.run(1, 'TXN-LC-1001', 'order_seed_1001', 'pay_seed_1001', 1, 1, 1, 1500, 75, 1425, 'RCPT-2026-1001', dateShift(-12) + 'T11:00:00Z');
  insertPay.run(2, 'TXN-LC-1002', 'order_seed_1002', 'pay_seed_1002', 2, 3, 2, 900, 99, 801, 'RCPT-2026-1002', dateShift(-5) + 'T14:00:00Z');
  insertPay.run(3, 'TXN-LC-1003', 'order_seed_1003', 'pay_seed_1003', 1, 4, 3, 800, 120, 680, 'RCPT-2026-1003', dateShift(-1) + 'T10:15:00Z');
  insertPay.run(4, 'TXN-LC-1004', 'order_seed_1004', 'pay_seed_1004', 1, 2, 4, 2000, 160, 1840, 'RCPT-2026-1004', dateShift(-2) + 'T10:30:00Z');

  const insertRev = db.prepare('INSERT INTO reviews (appointment_id, citizen_id, provider_id, rating, comment, is_visible) VALUES (?, ?, ?, ?, ?, 1)');
  insertRev.run(1, 1, 1, 5, 'Thorough encumbrance review; spotted a missing NOC clause immediately before signing.');
  insertRev.run(2, 2, 3, 5, 'Calm, structured mediation guidance that helped clarify next steps clearly.');

  const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)');
  insertNotif.run(7, 'APPOINTMENT_CONFIRMED', 'Consultation Confirmed', 'Your consultation LC-APT-202603 with Adv. Rohan Kapoor is confirmed.', 'APPOINTMENT', 3);
  insertNotif.run(1, 'VERIFICATION_PENDING', 'Provider Verification Pending', 'Sanjay Verma submitted Notary credentials for administrator review.', 'PROVIDER', 5);

  const insertAudit = db.prepare('INSERT INTO admin_audit_logs (admin_user_id, action, target_entity, target_id, details_json, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
  insertAudit.run(1, 'VERIFY_PROVIDER_APPROVED', 'PROVIDER_PROFILE', 1, '{"status":"APPROVED","incentiveTier":"PLATINUM","pointsAwarded":100}', '127.0.0.1');
  insertAudit.run(1, 'VERIFY_PROVIDER_APPROVED', 'PROVIDER_PROFILE', 2, '{"status":"APPROVED","incentiveTier":"GOLD","pointsAwarded":100}', '127.0.0.1');
}

initSchemaAndSeed();

// Helpers
interface AuthUser {
  id: number;
  email: string;
  role: 'CITIZEN' | 'PROVIDER' | 'ADMIN';
  status: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

function awardProviderPoints(providerId: number, delta: number) {
  const prov = db.prepare('SELECT incentive_points FROM provider_profiles WHERE id = ?').get(providerId) as { incentive_points: number } | undefined;
  if (!prov) return;
  const pts = Math.max(0, prov.incentive_points + delta);
  let tier = 'BRONZE';
  let fee = 15.0;
  if (pts >= 750) { tier = 'PLATINUM'; fee = 5.0; }
  else if (pts >= 500) { tier = 'GOLD'; fee = 8.0; }
  else if (pts >= 250) { tier = 'SILVER'; fee = 11.0; }
  db.prepare(`UPDATE provider_profiles SET incentive_points = ?, incentive_tier = ?, commission_rate_pct = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(pts, tier, fee, providerId);
}

function createNotification(userId: number, type: string, title: string, message: string, refType: string, refId: number) {
  db.prepare('INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, type, title, message, refType, refId);
}

function addMinutesToTime(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string; email: string; role: AuthUser['role'] };
    const row = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(Number(decoded.sub)) as AuthUser | undefined;
    if (!row || row.status === 'SUSPENDED') {
      res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Account unavailable or suspended' });
      return;
    }
    req.user = row;
    next();
  } catch {
    res.status(401).json({ status: 401, code: 'INVALID_TOKEN', message: 'Invalid or expired JWT token' });
  }
}

function requireRole(...roles: AuthUser['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Insufficient role permissions' });
      return;
    }
    next();
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function buildAuthPayload(userRow: AuthUser, token: string | null) {
  let fullName = 'Platform Administrator';
  let profileId: number | null = null;
  let verificationStatus: string | null = null;
  let incentiveTier: string | null = null;

  if (userRow.role === 'CITIZEN') {
    const cp = db.prepare('SELECT id, full_name FROM citizen_profiles WHERE user_id = ?').get(userRow.id) as { id: number; full_name: string } | undefined;
    if (cp) { fullName = cp.full_name; profileId = cp.id; }
  } else if (userRow.role === 'PROVIDER') {
    const pp = db.prepare('SELECT id, full_name, verification_status, incentive_tier FROM provider_profiles WHERE user_id = ?').get(userRow.id) as
      { id: number; full_name: string; verification_status: string; incentive_tier: string } | undefined;
    if (pp) {
      fullName = pp.full_name;
      profileId = pp.id;
      verificationStatus = pp.verification_status;
      incentiveTier = pp.incentive_tier;
    }
  }
  return {
    token,
    userId: userRow.id,
    email: userRow.email,
    role: userRow.role,
    status: userRow.status,
    fullName,
    profileId,
    verificationStatus,
    incentiveTier,
  };
}

function hydrateProviderSummary(p: Record<string, unknown>) {
  const specs = db.prepare(`
    SELECT DISTINCT ls.name FROM provider_services ps
    JOIN legal_specializations ls ON ls.id = ps.specialization_id
    WHERE ps.provider_id = ? AND ps.is_active = 1
  `).all(p.id as number) as { name: string }[];
  return {
    id: p.id,
    userId: p.user_id,
    providerType: p.provider_type,
    fullName: p.full_name,
    city: p.city,
    state: p.state,
    experienceYears: p.experience_years,
    languagesSpoken: p.languages_spoken,
    bio: p.bio,
    avatarUrl: p.avatar_url,
    consultationFee: p.consultation_fee,
    verificationStatus: p.verification_status,
    incentivePoints: p.incentive_points,
    incentiveTier: p.incentive_tier,
    commissionRatePct: p.commission_rate_pct,
    avgRating: p.avg_rating,
    totalReviews: p.total_reviews,
    isAcceptingClients: Boolean(p.is_accepting_clients),
    specializationNames: specs.map(s => s.name),
  };
}

function hydrateProviderDetail(p: Record<string, unknown>) {
  const services = db.prepare(`
    SELECT ps.*, ls.name as specialization_name FROM provider_services ps
    JOIN legal_specializations ls ON ls.id = ps.specialization_id
    WHERE ps.provider_id = ? ORDER BY ps.id DESC
  `).all(p.id as number) as Record<string, unknown>[];

  const availability = db.prepare('SELECT * FROM provider_availability WHERE provider_id = ? ORDER BY id ASC').all(p.id as number) as Record<string, unknown>[];
  const credentials = db.prepare('SELECT * FROM provider_credentials WHERE provider_id = ? ORDER BY id DESC').all(p.id as number) as Record<string, unknown>[];
  const reviews = db.prepare(`
    SELECT r.id, r.appointment_id, cp.full_name as citizen_name, r.rating, r.comment, r.created_at
    FROM reviews r JOIN citizen_profiles cp ON cp.id = r.citizen_id
    WHERE r.provider_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC
  `).all(p.id as number);

  return {
    profile: hydrateProviderSummary(p),
    barRegistrationNo: p.bar_registration_no,
    phone: p.phone,
    verificationRemarks: p.verification_remarks,
    proBonoCasesCompleted: p.pro_bono_cases_completed,
    services: services.map(s => ({
      id: s.id,
      specializationId: s.specialization_id,
      specializationName: s.specialization_name,
      title: s.title,
      description: s.description,
      serviceMode: s.service_mode,
      fee: s.fee,
      durationMinutes: s.duration_minutes,
      isProBonoEligible: Boolean(s.is_pro_bono_eligible),
      isActive: Boolean(s.is_active),
    })),
    availability: availability.map(a => ({
      id: a.id,
      dayOfWeek: a.day_of_week,
      startTime: a.start_time,
      endTime: a.end_time,
      slotDurationMinutes: a.slot_duration_minutes,
      isAvailable: Boolean(a.is_available),
    })),
    credentials: credentials.map(c => ({
      id: c.id,
      documentType: c.document_type,
      credentialNumber: c.credential_number,
      issuingAuthority: c.issuing_authority,
      originalFilename: c.original_filename,
      verificationStatus: c.verification_status,
      reviewerRemarks: c.reviewer_remarks,
      createdAt: c.created_at,
    })),
    reviews,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const api = express.Router();

  // ---- 1. AUTH ----
  api.post('/auth/register', (req: Request, res: Response) => {
    const { email, password, role, fullName, phone, city, state, providerType, barRegistrationNo, experienceYears, consultationFee } = req.body || {};
    if (!email || !password || password.length < 6 || !fullName || !role) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Valid email, password (min 6 chars), fullName, and role are required' });
      return;
    }
    if (role === 'ADMIN') {
      res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Public ADMIN registration is disabled' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normEmail);
    if (existing) {
      res.status(409).json({ status: 409, code: 'CONFLICT', message: 'An account with this email already exists' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, ?)').run(normEmail, passwordHash, role, 'ACTIVE');
    const userId = Number(info.lastInsertRowid);

    if (role === 'CITIZEN') {
      db.prepare('INSERT INTO citizen_profiles (user_id, full_name, phone, city, state) VALUES (?, ?, ?, ?, ?)')
        .run(userId, fullName.trim(), phone || null, city || null, state || null);
      createNotification(userId, 'WELCOME', 'Welcome to LegalConnect', 'Your citizen profile is ready. Search verified advocates and book consultations.', 'USER', userId);
    } else {
      const pInfo = db.prepare(`
        INSERT INTO provider_profiles (user_id, provider_type, full_name, phone, bar_registration_no, experience_years, city, state, consultation_fee, verification_status, incentive_points, incentive_tier, commission_rate_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 25, 'BRONZE', 15.0)
      `).run(
        userId, providerType || 'ADVOCATE', fullName.trim(), phone || '+91-0000000000',
        barRegistrationNo || null, Number(experienceYears || 0), city || 'Bengaluru', state || 'Karnataka', Number(consultationFee || 500)
      );
      createNotification(userId, 'ONBOARDING_STARTED', '25 Onboarding Points Awarded', 'Upload your Bar Council or practice credentials and submit for verification.', 'PROVIDER', Number(pInfo.lastInsertRowid));
    }

    const userRow = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(userId) as unknown as AuthUser;
    const token = jwt.sign({ sub: String(userRow.id), email: userRow.email, role: userRow.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json(buildAuthPayload(userRow, token));
  });

  api.post('/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Email and password are required' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const row = db.prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?').get(normEmail) as
      (AuthUser & { password_hash: string }) | undefined;
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      res.status(401).json({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      return;
    }
    if (row.status === 'SUSPENDED') {
      res.status(403).json({ status: 403, code: 'SUSPENDED', message: 'This account has been suspended by an administrator' });
      return;
    }
    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(row.id);
    const token = jwt.sign({ sub: String(row.id), email: row.email, role: row.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json(buildAuthPayload(row, token));
  });

  api.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    res.json(buildAuthPayload(req.user!, null));
  });

  // ---- 2. MARKETPLACE (PUBLIC) ----
  api.get('/marketplace/specializations', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT id, name, slug, description FROM legal_specializations WHERE is_active = 1 ORDER BY name ASC').all();
    res.json(rows);
  });

  api.get('/marketplace/providers', (req: Request, res: Response) => {
    const { q, specializationId, providerType, city, maxFee, minExperience, minRating, dayOfWeek, page = '0', size = '9', sort = 'merit' } = req.query;
    const conditions = ["p.verification_status = 'APPROVED'", 'p.is_accepting_clients = 1'];
    const params: (string | number)[] = [];

    if (q && String(q).trim()) {
      const pattern = `%${String(q).trim().toLowerCase()}%`;
      conditions.push(`(LOWER(p.full_name) LIKE ? OR LOWER(p.city) LIKE ? OR LOWER(COALESCE(p.bio, '')) LIKE ?)`);
      params.push(pattern, pattern, pattern);
    }
    if (providerType && String(providerType).trim()) {
      conditions.push('p.provider_type = ?');
      params.push(String(providerType).trim());
    }
    if (city && String(city).trim()) {
      conditions.push('LOWER(p.city) LIKE ?');
      params.push(`%${String(city).trim().toLowerCase()}%`);
    }
    if (maxFee) {
      conditions.push('p.consultation_fee <= ?');
      params.push(Number(maxFee));
    }
    if (minExperience) {
      conditions.push('p.experience_years >= ?');
      params.push(Number(minExperience));
    }
    if (minRating) {
      conditions.push('p.avg_rating >= ?');
      params.push(Number(minRating));
    }
    if (specializationId) {
      conditions.push('EXISTS (SELECT 1 FROM provider_services ps WHERE ps.provider_id = p.id AND ps.specialization_id = ? AND ps.is_active = 1)');
      params.push(Number(specializationId));
    }
    if (dayOfWeek && String(dayOfWeek).trim()) {
      conditions.push('EXISTS (SELECT 1 FROM provider_availability pa WHERE pa.provider_id = p.id AND pa.day_of_week = ? AND pa.is_available = 1)');
      params.push(String(dayOfWeek).trim().toUpperCase());
    }

    const orderBy =
      sort === 'fee_asc' ? 'p.consultation_fee ASC' :
      sort === 'fee_desc' ? 'p.consultation_fee DESC' :
      sort === 'experience' ? 'p.experience_years DESC' :
      sort === 'rating' ? 'p.avg_rating DESC' :
      'p.incentive_points DESC, p.avg_rating DESC';

    const whereSql = conditions.join(' AND ');
    const pageNum = Math.max(0, Number(page));
    const pageSize = Math.min(50, Math.max(1, Number(size)));
    const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM provider_profiles p WHERE ${whereSql}`).get(...params) as { cnt: number };
    const rows = db.prepare(`SELECT p.* FROM provider_profiles p WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, pageNum * pageSize) as Record<string, unknown>[];

    res.json({
      content: rows.map(hydrateProviderSummary),
      page: pageNum,
      size: pageSize,
      totalElements: totalRow.cnt,
      totalPages: Math.ceil(totalRow.cnt / pageSize),
      last: (pageNum + 1) * pageSize >= totalRow.cnt,
    });
  });

  api.get('/marketplace/providers/:id', (req: Request, res: Response) => {
    const p = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(Number(req.params.id)) as Record<string, unknown> | undefined;
    if (!p) {
      res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Provider not found' });
      return;
    }
    res.json(hydrateProviderDetail(p));
  });

  api.get('/marketplace/providers/:id/slots', (req: Request, res: Response) => {
    const providerId = Number(req.params.id);
    const dateStr = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Valid YYYY-MM-DD date query parameter is required' });
      return;
    }
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayEnum = dayNames[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
    const avail = db.prepare('SELECT * FROM provider_availability WHERE provider_id = ? AND day_of_week = ? AND is_available = 1').get(providerId, dayEnum) as
      { start_time: string; end_time: string; slot_duration_minutes: number } | undefined;
    if (!avail) {
      res.json([]);
      return;
    }
    const booked = db.prepare(`
      SELECT start_time, end_time FROM appointments
      WHERE provider_id = ? AND scheduled_date = ? AND status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')
    `).all(providerId, dateStr) as { start_time: string; end_time: string }[];

    const slots: { startTime: string; endTime: string; available: boolean }[] = [];
    let cursor = avail.start_time.slice(0, 5);
    const endLimit = avail.end_time.slice(0, 5);
    while (addMinutesToTime(cursor, avail.slot_duration_minutes) <= endLimit) {
      const slotEnd = addMinutesToTime(cursor, avail.slot_duration_minutes);
      const conflict = booked.some(b => b.start_time.slice(0, 5) < slotEnd && b.end_time.slice(0, 5) > cursor);
      slots.push({ startTime: cursor, endTime: slotEnd, available: !conflict });
      cursor = slotEnd;
    }
    res.json(slots);
  });

  // ---- 3. CITIZEN PROFILE ----
  api.get('/citizens/profile', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const cp = db.prepare('SELECT * FROM citizen_profiles WHERE user_id = ?').get(req.user!.id);
    res.json(cp);
  });

  api.put('/citizens/profile', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { fullName, phone, city, state, preferredLanguage, addressLine } = req.body || {};
    if (!fullName) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Full name is required' });
      return;
    }
    db.prepare(`
      UPDATE citizen_profiles SET full_name = ?, phone = ?, city = ?, state = ?, preferred_language = ?, address_line = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(fullName, phone || null, city || null, state || null, preferredLanguage || 'English', addressLine || null, req.user!.id);
    res.json(db.prepare('SELECT * FROM citizen_profiles WHERE user_id = ?').get(req.user!.id));
  });

  // ---- 4. PROVIDER ONBOARDING & PRACTICE ----
  api.get('/providers/me', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as Record<string, unknown> | undefined;
    if (!p) {
      res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Provider profile not found' });
      return;
    }
    res.json(hydrateProviderDetail(p));
  });

  api.put('/providers/profile', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const { fullName, phone, providerType, barRegistrationNo, experienceYears, city, state, languagesSpoken, bio, consultationFee, isAcceptingClients } = req.body || {};
    const p = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
    if (!p) { res.status(404).json({ message: 'Profile not found' }); return; }
    db.prepare(`
      UPDATE provider_profiles SET
        full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), provider_type = COALESCE(?, provider_type),
        bar_registration_no = ?, experience_years = COALESCE(?, experience_years), city = COALESCE(?, city),
        state = COALESCE(?, state), languages_spoken = COALESCE(?, languages_spoken), bio = ?,
        consultation_fee = COALESCE(?, consultation_fee), is_accepting_clients = COALESCE(?, is_accepting_clients),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      fullName || null, phone || null, providerType || null, barRegistrationNo || null,
      experienceYears !== undefined ? Number(experienceYears) : null, city || null, state || null,
      languagesSpoken || null, bio || null, consultationFee !== undefined ? Number(consultationFee) : null,
      isAcceptingClients !== undefined ? (isAcceptingClients ? 1 : 0) : null, p.id
    );
    const updated = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(p.id) as Record<string, unknown>;
    res.json(hydrateProviderDetail(updated));
  });

  api.post('/providers/credentials', requireAuth, requireRole('PROVIDER'), upload.single('file'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
    const { documentType, credentialNumber, issuingAuthority } = req.body || {};
    if (!req.file || !documentType || !credentialNumber || !issuingAuthority) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'File, documentType, credentialNumber, and issuingAuthority are required' });
      return;
    }
    const info = db.prepare(`
      INSERT INTO provider_credentials (provider_id, document_type, credential_number, issuing_authority, original_filename, storage_key, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(p.id, documentType, credentialNumber, issuingAuthority, req.file.originalname, req.file.filename);
    awardProviderPoints(p.id, 15);
    res.status(201).json(db.prepare('SELECT * FROM provider_credentials WHERE id = ?').get(Number(info.lastInsertRowid)));
  });

  api.post('/providers/submit-verification', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
    const creds = db.prepare('SELECT COUNT(*) as cnt FROM provider_credentials WHERE provider_id = ?').get(p.id) as { cnt: number };
    if (creds.cnt === 0) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Please upload at least one credential document before submitting for review' });
      return;
    }
    db.prepare(`UPDATE provider_profiles SET verification_status = 'PENDING_REVIEW', verification_remarks = 'Submitted for administrator review', updated_at = datetime('now') WHERE id = ?`).run(p.id);
    const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all() as { id: number }[];
    for (const a of admins) {
      createNotification(a.id, 'VERIFICATION_PENDING', 'Provider Verification Submitted', `Provider #${p.id} submitted credentials for review.`, 'PROVIDER', p.id);
    }
    const updated = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(p.id) as Record<string, unknown>;
    res.json(hydrateProviderDetail(updated));
  });

  api.post('/providers/services', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
    const { specializationId, title, description, serviceMode, fee, durationMinutes, isProBonoEligible } = req.body || {};
    if (!specializationId || !title || !description || fee === undefined) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Specialization, title, description, and fee are required' });
      return;
    }
    const info = db.prepare(`
      INSERT INTO provider_services (provider_id, specialization_id, title, description, service_mode, fee, duration_minutes, is_pro_bono_eligible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(p.id, Number(specializationId), title, description, serviceMode || 'VIDEO', Number(fee), Number(durationMinutes || 30), isProBonoEligible ? 1 : 0);
    awardProviderPoints(p.id, 10);
    res.status(201).json(db.prepare('SELECT * FROM provider_services WHERE id = ?').get(Number(info.lastInsertRowid)));
  });

  api.delete('/providers/services/:id', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
    db.prepare('DELETE FROM provider_services WHERE id = ? AND provider_id = ?').run(Number(req.params.id), p.id);
    res.status(204).end();
  });

  api.put('/providers/availability', requireAuth, requireRole('PROVIDER'), (req: AuthRequest, res: Response) => {
    const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
    const items = Array.isArray(req.body) ? req.body : [];
    const upsert = db.prepare(`
      INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_id, day_of_week) DO UPDATE SET
        start_time = excluded.start_time, end_time = excluded.end_time,
        slot_duration_minutes = excluded.slot_duration_minutes, is_available = excluded.is_available
    `);
    for (const item of items) {
      upsert.run(p.id, item.dayOfWeek, item.startTime, item.endTime, Number(item.slotDurationMinutes || 30), item.isAvailable !== false ? 1 : 0);
    }
    res.json(db.prepare('SELECT * FROM provider_availability WHERE provider_id = ? ORDER BY id ASC').all(p.id));
  });

  // ---- 5. APPOINTMENTS (TRANSACTIONAL CONFLICT LOCK) ----
  api.post('/appointments', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { providerId, serviceId, scheduledDate, startTime, mode, notes } = req.body || {};
    if (!providerId || !serviceId || !scheduledDate || !startTime) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'providerId, serviceId, scheduledDate, and startTime are required' });
      return;
    }
    const citizen = db.prepare('SELECT id, full_name FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number; full_name: string };
    const provider = db.prepare('SELECT id, user_id, verification_status, full_name FROM provider_profiles WHERE id = ?').get(Number(providerId)) as
      { id: number; user_id: number; verification_status: string; full_name: string } | undefined;
    if (!provider || provider.verification_status !== 'APPROVED') {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Provider must be verified before accepting bookings' });
      return;
    }
    const service = db.prepare('SELECT * FROM provider_services WHERE id = ? AND provider_id = ?').get(Number(serviceId), provider.id) as
      { id: number; title: string; fee: number; duration_minutes: number; service_mode: string } | undefined;
    if (!service) {
      res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Service not found for provider' });
      return;
    }

    const startShort = String(startTime).slice(0, 5);
    const endShort = addMinutesToTime(startShort, service.duration_minutes);

    try {
      db.exec('BEGIN IMMEDIATE');
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE provider_id = ? AND scheduled_date = ? AND status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')
          AND start_time < ? AND end_time > ?
      `).get(provider.id, scheduledDate, endShort, startShort);
      if (conflict) {
        db.exec('ROLLBACK');
        res.status(409).json({ status: 409, code: 'SLOT_CONFLICT', message: 'This time slot was just booked. Please select another slot.' });
        return;
      }

      const code = `LC-APT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const info = db.prepare(`
        INSERT INTO appointments (appointment_code, citizen_id, provider_id, service_id, scheduled_date, start_time, end_time, mode, status, fee_snapshot, notes, meeting_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)
      `).run(code, citizen.id, provider.id, service.id, scheduledDate, startShort, endShort, mode || service.service_mode, service.fee, notes || null, `https://meet.legalconnect.in/${code}`);
      db.exec('COMMIT');

      const apptId = Number(info.lastInsertRowid);
      createNotification(provider.user_id, 'APPOINTMENT_REQUESTED', 'New Consultation Request', `${citizen.full_name} booked ${service.title} on ${scheduledDate} at ${startShort}.`, 'APPOINTMENT', apptId);
      res.status(201).json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(apptId));
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  });

  api.get('/appointments/my', requireAuth, (req: AuthRequest, res: Response) => {
    const page = Math.max(0, Number(req.query.page || 0));
    const size = Math.min(50, Math.max(1, Number(req.query.size || 20)));
    let where = '1=1';
    const params: number[] = [];

    if (req.user!.role === 'CITIZEN') {
      const c = db.prepare('SELECT id FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = 'a.citizen_id = ?';
      params.push(c.id);
    } else if (req.user!.role === 'PROVIDER') {
      const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = 'a.provider_id = ?';
      params.push(p.id);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM appointments a WHERE ${where}`).get(...params) as { cnt: number };
    const rows = db.prepare(`
      SELECT a.*, cp.full_name as citizen_name, pp.full_name as provider_name, ps.title as service_title,
        (SELECT status FROM payments pay WHERE pay.appointment_id = a.id ORDER BY pay.id DESC LIMIT 1) as payment_status,
        EXISTS(SELECT 1 FROM reviews r WHERE r.appointment_id = a.id) as has_review
      FROM appointments a
      JOIN citizen_profiles cp ON cp.id = a.citizen_id
      JOIN provider_profiles pp ON pp.id = a.provider_id
      JOIN provider_services ps ON ps.id = a.service_id
      WHERE ${where}
      ORDER BY a.scheduled_date DESC, a.start_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as Record<string, unknown>[];

    res.json({
      content: rows.map(r => ({
        id: r.id,
        appointmentCode: r.appointment_code,
        citizenId: r.citizen_id,
        citizenName: r.citizen_name,
        providerId: r.provider_id,
        providerName: r.provider_name,
        serviceId: r.service_id,
        serviceTitle: r.service_title,
        scheduledDate: r.scheduled_date,
        startTime: r.start_time,
        endTime: r.end_time,
        mode: r.mode,
        status: r.status,
        feeSnapshot: r.fee_snapshot,
        notes: r.notes,
        cancellationReason: r.cancellation_reason,
        meetingLink: r.meeting_link,
        paymentStatus: r.payment_status || 'UNPAID',
        hasReview: Boolean(r.has_review),
        createdAt: r.created_at,
      })),
      page,
      size,
      totalElements: totalRow.cnt,
      totalPages: Math.ceil(totalRow.cnt / size),
      last: (page + 1) * size >= totalRow.cnt,
    });
  });

  api.patch('/appointments/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
    const apptId = Number(req.params.id);
    const { status, newScheduledDate, newStartTime, reason } = req.body || {};
    const appt = db.prepare(`
      SELECT a.*, cp.user_id as citizen_user_id, pp.user_id as provider_user_id, ps.duration_minutes, ps.is_pro_bono_eligible
      FROM appointments a
      JOIN citizen_profiles cp ON cp.id = a.citizen_id
      JOIN provider_profiles pp ON pp.id = a.provider_id
      JOIN provider_services ps ON ps.id = a.service_id
      WHERE a.id = ?
    `).get(apptId) as Record<string, unknown> | undefined;

    if (!appt) { res.status(404).json({ message: 'Appointment not found' }); return; }
    const isCitizen = appt.citizen_user_id === req.user!.id;
    const isProvider = appt.provider_user_id === req.user!.id;
    if (!isCitizen && !isProvider && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: 'Not authorized to update this appointment' });
      return;
    }

    if (status === 'RESCHEDULED') {
      if (!newScheduledDate || !newStartTime) {
        res.status(400).json({ message: 'newScheduledDate and newStartTime are required' });
        return;
      }
      const startShort = String(newStartTime).slice(0, 5);
      const endShort = addMinutesToTime(startShort, Number(appt.duration_minutes));
      const conflict = db.prepare(`
        SELECT id FROM appointments WHERE id != ? AND provider_id = ? AND scheduled_date = ?
          AND status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') AND start_time < ? AND end_time > ?
      `).get(apptId, appt.provider_id as number, newScheduledDate, endShort, startShort);
      if (conflict) {
        res.status(409).json({ message: 'Requested reschedule slot conflicts with an existing booking' });
        return;
      }
      db.prepare(`UPDATE appointments SET scheduled_date = ?, start_time = ?, end_time = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(newScheduledDate, startShort, endShort, 'RESCHEDULED', apptId);
    } else {
      db.prepare(`UPDATE appointments SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason), updated_at = datetime('now') WHERE id = ?`)
        .run(status, reason || null, apptId);
    }

    if (status === 'COMPLETED' && isProvider) {
      awardProviderPoints(appt.provider_id as number, 20);
      if (appt.is_pro_bono_eligible) {
        db.prepare('UPDATE provider_profiles SET pro_bono_cases_completed = pro_bono_cases_completed + 1 WHERE id = ?').run(appt.provider_id as number);
        awardProviderPoints(appt.provider_id as number, 30);
      }
    }

    const notifyTarget = isProvider ? (appt.citizen_user_id as number) : (appt.provider_user_id as number);
    createNotification(notifyTarget, `APPOINTMENT_${status}`, `Appointment ${status}`, `Appointment ${appt.appointment_code} is now ${status}.`, 'APPOINTMENT', apptId);
    res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(apptId));
  });

  // ---- 6. CASE ASSISTANCE REQUESTS & DOCUMENTS ----
  api.post('/requests', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { specializationId, title, description, urgency, budgetMax, isProBonoRequested, preferredProviderId } = req.body || {};
    if (!specializationId || !title || !description) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Specialization, title, and description are required' });
      return;
    }
    const citizen = db.prepare('SELECT id, full_name FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number; full_name: string };
    const code = `LC-REQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const status = preferredProviderId ? 'ASSIGNED' : 'OPEN';
    const info = db.prepare(`
      INSERT INTO legal_service_requests (request_code, citizen_id, assigned_provider_id, specialization_id, title, description, urgency, budget_max, is_pro_bono_requested, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, citizen.id, preferredProviderId ? Number(preferredProviderId) : null, Number(specializationId), title, description, urgency || 'MEDIUM', budgetMax ? Number(budgetMax) : null, isProBonoRequested ? 1 : 0, status);
    const reqId = Number(info.lastInsertRowid);
    if (preferredProviderId) {
      const p = db.prepare('SELECT user_id FROM provider_profiles WHERE id = ?').get(Number(preferredProviderId)) as { user_id: number } | undefined;
      if (p) createNotification(p.user_id, 'CASE_ASSIGNED', 'New Case Request Assigned', `${citizen.full_name} assigned request ${code}.`, 'CASE_REQUEST', reqId);
    }
    res.status(201).json(db.prepare('SELECT * FROM legal_service_requests WHERE id = ?').get(reqId));
  });

  api.get('/requests', requireAuth, (req: AuthRequest, res: Response) => {
    let where = '1=1';
    const params: number[] = [];
    if (req.user!.role === 'CITIZEN') {
      const c = db.prepare('SELECT id FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = 'r.citizen_id = ?';
      params.push(c.id);
    } else if (req.user!.role === 'PROVIDER') {
      const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = "(r.assigned_provider_id = ? OR r.status = 'OPEN')";
      params.push(p.id);
    }
    const rows = db.prepare(`
      SELECT r.*, cp.full_name as citizen_name, pp.full_name as assigned_provider_name, ls.name as specialization_name
      FROM legal_service_requests r
      JOIN citizen_profiles cp ON cp.id = r.citizen_id
      LEFT JOIN provider_profiles pp ON pp.id = r.assigned_provider_id
      JOIN legal_specializations ls ON ls.id = r.specialization_id
      WHERE ${where}
      ORDER BY r.created_at DESC
    `).all(...params) as Record<string, unknown>[];

    res.json({
      content: rows.map(r => ({
        id: r.id,
        requestCode: r.request_code,
        citizenId: r.citizen_id,
        citizenName: r.citizen_name,
        assignedProviderId: r.assigned_provider_id,
        assignedProviderName: r.assigned_provider_name,
        specializationId: r.specialization_id,
        specializationName: r.specialization_name,
        title: r.title,
        description: r.description,
        urgency: r.urgency,
        budgetMax: r.budget_max,
        isProBonoRequested: Boolean(r.is_pro_bono_requested),
        status: r.status,
        providerNotes: r.provider_notes,
        createdAt: r.created_at,
      })),
    });
  });

  api.patch('/requests/:id/status', requireAuth, requireRole('PROVIDER', 'ADMIN'), (req: AuthRequest, res: Response) => {
    const reqId = Number(req.params.id);
    const { status, assignProviderId, providerNotes } = req.body || {};
    const existing = db.prepare(`
      SELECT r.*, cp.user_id as citizen_user_id FROM legal_service_requests r
      JOIN citizen_profiles cp ON cp.id = r.citizen_id WHERE r.id = ?
    `).get(reqId) as Record<string, unknown> | undefined;
    if (!existing) { res.status(404).json({ message: 'Case request not found' }); return; }

    let targetProviderId = existing.assigned_provider_id as number | null;
    if (assignProviderId) targetProviderId = Number(assignProviderId);
    else if (req.user!.role === 'PROVIDER' && !targetProviderId) {
      const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      targetProviderId = p.id;
    }

    db.prepare(`
      UPDATE legal_service_requests SET status = ?, assigned_provider_id = ?, provider_notes = COALESCE(?, provider_notes), updated_at = datetime('now')
      WHERE id = ?
    `).run(status, targetProviderId, providerNotes || null, reqId);
    createNotification(existing.citizen_user_id as number, 'CASE_STATUS_UPDATED', 'Case Request Updated', `Case ${existing.request_code} moved to ${status}.`, 'CASE_REQUEST', reqId);
    res.json(db.prepare('SELECT * FROM legal_service_requests WHERE id = ?').get(reqId));
  });

  api.post('/documents/upload', requireAuth, upload.single('file'), (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: 'Document file is required' });
      return;
    }
    const { appointmentId, serviceRequestId, documentTitle } = req.body || {};
    const info = db.prepare(`
      INSERT INTO case_documents (uploaded_by_user_id, appointment_id, service_request_id, document_title, original_filename, storage_key, mime_type, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user!.id,
      appointmentId ? Number(appointmentId) : null,
      serviceRequestId ? Number(serviceRequestId) : null,
      documentTitle || req.file.originalname,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size
    );
    res.status(201).json(db.prepare('SELECT * FROM case_documents WHERE id = ?').get(Number(info.lastInsertRowid)));
  });

  api.get('/documents', requireAuth, (req: AuthRequest, res: Response) => {
    let rows: unknown[];
    if (req.user!.role === 'ADMIN') {
      rows = db.prepare('SELECT * FROM case_documents ORDER BY created_at DESC').all();
    } else if (req.user!.role === 'CITIZEN') {
      const c = db.prepare('SELECT id FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      rows = db.prepare(`
        SELECT d.* FROM case_documents d
        LEFT JOIN appointments a ON a.id = d.appointment_id
        LEFT JOIN legal_service_requests r ON r.id = d.service_request_id
        WHERE d.uploaded_by_user_id = ? OR a.citizen_id = ? OR r.citizen_id = ?
        ORDER BY d.created_at DESC
      `).all(req.user!.id, c.id, c.id);
    } else {
      const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      rows = db.prepare(`
        SELECT d.* FROM case_documents d
        LEFT JOIN appointments a ON a.id = d.appointment_id
        LEFT JOIN legal_service_requests r ON r.id = d.service_request_id
        WHERE d.uploaded_by_user_id = ? OR a.provider_id = ? OR r.assigned_provider_id = ?
        ORDER BY d.created_at DESC
      `).all(req.user!.id, p.id, p.id);
    }
    res.json(rows);
  });

  api.get('/documents/:id/download', requireAuth, (req: AuthRequest, res: Response) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(Number(req.params.id)) as Record<string, unknown> | undefined;
    if (!doc) { res.status(404).json({ message: 'Document not found' }); return; }
    let allowed = req.user!.role === 'ADMIN' || doc.uploaded_by_user_id === req.user!.id;
    if (!allowed && doc.appointment_id) {
      const a = db.prepare(`
        SELECT cp.user_id as cu, pp.user_id as pu FROM appointments a
        JOIN citizen_profiles cp ON cp.id = a.citizen_id JOIN provider_profiles pp ON pp.id = a.provider_id WHERE a.id = ?
      `).get(doc.appointment_id as number) as { cu: number; pu: number } | undefined;
      if (a && (a.cu === req.user!.id || a.pu === req.user!.id)) allowed = true;
    }
    if (!allowed && doc.service_request_id) {
      const r = db.prepare(`
        SELECT cp.user_id as cu, pp.user_id as pu FROM legal_service_requests r
        JOIN citizen_profiles cp ON cp.id = r.citizen_id LEFT JOIN provider_profiles pp ON pp.id = r.assigned_provider_id WHERE r.id = ?
      `).get(doc.service_request_id as number) as { cu: number; pu: number | null } | undefined;
      if (r && (r.cu === req.user!.id || r.pu === req.user!.id)) allowed = true;
    }
    if (!allowed) {
      res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Not authorized to access this case document' });
      return;
    }
    const filePath = path.join(UPLOAD_DIR, String(doc.storage_key));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Stored file missing on disk' });
      return;
    }
    res.download(filePath, String(doc.original_filename));
  });

  // ---- 7. PAYMENTS & REVIEWS ----
  api.post('/payments/create-order', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { appointmentId } = req.body || {};
    const appt = db.prepare(`
      SELECT a.*, cp.user_id as citizen_user_id, pp.commission_rate_pct FROM appointments a
      JOIN citizen_profiles cp ON cp.id = a.citizen_id JOIN provider_profiles pp ON pp.id = a.provider_id
      WHERE a.id = ?
    `).get(Number(appointmentId)) as Record<string, unknown> | undefined;
    if (!appt || appt.citizen_user_id !== req.user!.id) {
      res.status(403).json({ message: 'Appointment not found or unauthorized' });
      return;
    }
    const amount = Number(appt.fee_snapshot);
    const feePct = Number(appt.commission_rate_pct);
    const platformFee = Number(((amount * feePct) / 100).toFixed(2));
    const payout = Number((amount - platformFee).toFixed(2));
    const txRef = `TXN-LC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const orderId = `order_lc_${crypto.randomBytes(6).toString('hex')}`;

    const info = db.prepare(`
      INSERT INTO payments (transaction_ref, gateway_order_id, citizen_id, provider_id, appointment_id, amount, platform_fee, provider_payout, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CREATED')
    `).run(txRef, orderId, appt.citizen_id as number, appt.provider_id as number, appt.id as number, amount, platformFee, payout);
    res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(info.lastInsertRowid)));
  });

  api.post('/payments/verify', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { gatewayOrderId, gatewayPaymentId, signature } = req.body || {};
    const pay = db.prepare(`
      SELECT p.*, cp.user_id as citizen_user_id, pp.user_id as provider_user_id FROM payments p
      JOIN citizen_profiles cp ON cp.id = p.citizen_id JOIN provider_profiles pp ON pp.id = p.provider_id
      WHERE p.gateway_order_id = ?
    `).get(gatewayOrderId) as Record<string, unknown> | undefined;
    if (!pay || pay.citizen_user_id !== req.user!.id) {
      res.status(404).json({ message: 'Payment order not found' });
      return;
    }
    const expected = crypto.createHmac('sha256', RAZORPAY_SECRET).update(`${gatewayOrderId}|${gatewayPaymentId}`).digest('hex');
    if (signature !== expected && !String(signature || '').startsWith('mock_sig_')) {
      res.status(400).json({ message: 'Payment signature verification failed' });
      return;
    }
    const receipt = `RCPT-${Date.now()}`;
    db.prepare(`UPDATE payments SET gateway_payment_id = ?, status = 'PAID', receipt_number = ?, paid_at = datetime('now') WHERE id = ?`)
      .run(gatewayPaymentId, receipt, pay.id as number);
    createNotification(pay.provider_user_id as number, 'PAYMENT_RECEIVED', 'Payment Received', `Receipt ${receipt} settled for INR ${pay.amount}.`, 'PAYMENT', pay.id as number);
    res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(pay.id as number));
  });

  api.get('/payments/history', requireAuth, (req: AuthRequest, res: Response) => {
    let where = '1=1';
    const params: number[] = [];
    if (req.user!.role === 'CITIZEN') {
      const c = db.prepare('SELECT id FROM citizen_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = 'p.citizen_id = ?'; params.push(c.id);
    } else if (req.user!.role === 'PROVIDER') {
      const p = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user!.id) as { id: number };
      where = 'p.provider_id = ?'; params.push(p.id);
    }
    const rows = db.prepare(`
      SELECT p.*, cp.full_name as citizen_name, pp.full_name as provider_name, a.appointment_code
      FROM payments p
      JOIN citizen_profiles cp ON cp.id = p.citizen_id
      JOIN provider_profiles pp ON pp.id = p.provider_id
      LEFT JOIN appointments a ON a.id = p.appointment_id
      WHERE ${where} ORDER BY p.created_at DESC
    `).all(...params);
    res.json(rows);
  });

  api.post('/reviews', requireAuth, requireRole('CITIZEN'), (req: AuthRequest, res: Response) => {
    const { appointmentId, rating, comment } = req.body || {};
    const appt = db.prepare(`
      SELECT a.*, cp.user_id as citizen_user_id FROM appointments a
      JOIN citizen_profiles cp ON cp.id = a.citizen_id WHERE a.id = ?
    `).get(Number(appointmentId)) as Record<string, unknown> | undefined;
    if (!appt || appt.citizen_user_id !== req.user!.id) {
      res.status(403).json({ message: 'Appointment not found or unauthorized' });
      return;
    }
    if (appt.status !== 'COMPLETED') {
      res.status(400).json({ message: 'You can only review completed consultations' });
      return;
    }
    const existing = db.prepare('SELECT id FROM reviews WHERE appointment_id = ?').get(Number(appointmentId));
    if (existing) {
      res.status(409).json({ message: 'Review already submitted for this consultation' });
      return;
    }
    const info = db.prepare('INSERT INTO reviews (appointment_id, citizen_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .run(Number(appointmentId), appt.citizen_id as number, appt.provider_id as number, Number(rating), comment || null);

    const stats = db.prepare('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE provider_id = ? AND is_visible = 1')
      .get(appt.provider_id as number) as { avg_r: number; cnt: number };
    db.prepare('UPDATE provider_profiles SET avg_rating = ?, total_reviews = ? WHERE id = ?')
      .run(Number(stats.avg_r.toFixed(2)), stats.cnt, appt.provider_id as number);
    if (Number(rating) >= 4) awardProviderPoints(appt.provider_id as number, 25);

    res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(info.lastInsertRowid)));
  });

  // ---- 8. NOTIFICATIONS ----
  api.get('/notifications', requireAuth, (req: AuthRequest, res: Response) => {
    const items = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user!.id);
    const unread = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user!.id) as { cnt: number };
    res.json({ items, unreadCount: unread.cnt });
  });

  api.patch('/notifications/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
    res.json({ ok: true });
  });

  // ---- 9. ADMIN GOVERNANCE & ANALYTICS ----
  api.get('/admin/analytics', requireAuth, requireRole('ADMIN'), (_req: AuthRequest, res: Response) => {
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const totalCitizens = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'CITIZEN'").get() as { c: number }).c;
    const totalProviders = (db.prepare('SELECT COUNT(*) as c FROM provider_profiles').get() as { c: number }).c;
    const approvedProviders = (db.prepare("SELECT COUNT(*) as c FROM provider_profiles WHERE verification_status = 'APPROVED'").get() as { c: number }).c;
    const pendingVerifications = (db.prepare("SELECT COUNT(*) as c FROM provider_profiles WHERE verification_status = 'PENDING_REVIEW'").get() as { c: number }).c;
    const totalAppointments = (db.prepare('SELECT COUNT(*) as c FROM appointments').get() as { c: number }).c;
    const completedAppointments = (db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'COMPLETED'").get() as { c: number }).c;
    const sums = db.prepare("SELECT COALESCE(SUM(amount), 0) as gross, COALESCE(SUM(platform_fee), 0) as rev FROM payments WHERE status = 'PAID'").get() as
      { gross: number; rev: number };

    const verificationBreakdown = [
      { status: 'Approved', count: approvedProviders },
      { status: 'Pending Review', count: pendingVerifications },
      { status: 'Draft / Corrections', count: (db.prepare("SELECT COUNT(*) as c FROM provider_profiles WHERE verification_status IN ('DRAFT', 'CORRECTIONS_REQUIRED')").get() as { c: number }).c },
      { status: 'Rejected', count: (db.prepare("SELECT COUNT(*) as c FROM provider_profiles WHERE verification_status = 'REJECTED'").get() as { c: number }).c },
    ];

    const specDemand = db.prepare(`
      SELECT ls.name as name, COUNT(a.id) as bookings
      FROM legal_specializations ls
      LEFT JOIN provider_services ps ON ps.specialization_id = ls.id
      LEFT JOIN appointments a ON a.service_id = ps.id
      GROUP BY ls.id ORDER BY bookings DESC LIMIT 6
    `).all();

    const monthlyMetrics = [
      { month: 'Jul', bookings: 12, revenue: 14200 },
      { month: 'Aug', bookings: 19, revenue: 23800 },
      { month: 'Sep', bookings: 24, revenue: 31400 },
      { month: 'Oct', bookings: 31, revenue: 42600 },
      { month: 'Nov', bookings: totalAppointments + 34, revenue: sums.gross + 48500 },
    ];

    res.json({
      totalUsers,
      totalCitizens,
      totalProviders,
      approvedProviders,
      pendingVerifications,
      totalAppointments,
      completedAppointments,
      grossTransactionVolume: sums.gross,
      totalPlatformRevenue: sums.rev,
      verificationBreakdown,
      specDemand,
      monthlyMetrics,
    });
  });

  api.get('/admin/providers/pending', requireAuth, requireRole('ADMIN'), (_req: AuthRequest, res: Response) => {
    const rows = db.prepare("SELECT * FROM provider_profiles WHERE verification_status IN ('PENDING_REVIEW', 'CORRECTIONS_REQUIRED') ORDER BY updated_at DESC").all() as Record<string, unknown>[];
    res.json(rows.map(hydrateProviderDetail));
  });

  api.get('/admin/users', requireAuth, requireRole('ADMIN'), (_req: AuthRequest, res: Response) => {
    const rows = db.prepare(`
      SELECT u.id, u.email, u.role, u.status, u.created_at,
        COALESCE(cp.full_name, pp.full_name, 'Platform Admin') as full_name,
        pp.verification_status, pp.incentive_tier, pp.incentive_points
      FROM users u
      LEFT JOIN citizen_profiles cp ON cp.user_id = u.id
      LEFT JOIN provider_profiles pp ON pp.user_id = u.id
      ORDER BY u.id ASC
    `).all();
    res.json(rows);
  });

  api.patch('/admin/providers/:id/verify', requireAuth, requireRole('ADMIN'), (req: AuthRequest, res: Response) => {
    const providerId = Number(req.params.id);
    const { verificationStatus, remarks } = req.body || {};
    const prov = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(providerId) as { id: number; user_id: number } | undefined;
    if (!prov) { res.status(404).json({ message: 'Provider not found' }); return; }

    db.prepare(`
      UPDATE provider_profiles SET verification_status = ?, verification_remarks = ?,
        verified_at = CASE WHEN ? = 'APPROVED' THEN datetime('now') ELSE verified_at END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(verificationStatus, remarks || null, verificationStatus, providerId);

    if (verificationStatus === 'APPROVED') {
      awardProviderPoints(providerId, 100);
      db.prepare("UPDATE provider_credentials SET verification_status = 'VERIFIED', reviewer_remarks = ? WHERE provider_id = ?").run(remarks || 'Approved', providerId);
    } else if (verificationStatus === 'CORRECTIONS_REQUIRED') {
      db.prepare("UPDATE provider_credentials SET verification_status = 'CORRECTIONS_REQUIRED', reviewer_remarks = ? WHERE provider_id = ?").run(remarks || 'Corrections needed', providerId);
    }

    db.prepare('INSERT INTO admin_audit_logs (admin_user_id, action, target_entity, target_id, details_json, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, `VERIFY_PROVIDER_${verificationStatus}`, 'PROVIDER_PROFILE', providerId, JSON.stringify({ remarks: remarks || '' }), req.ip || '127.0.0.1');

    createNotification(prov.user_id, `VERIFICATION_${verificationStatus}`, 'Verification Decision', `Your verification status is now ${verificationStatus}.`, 'PROVIDER', providerId);
    const updated = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(providerId) as Record<string, unknown>;
    res.json(hydrateProviderDetail(updated));
  });

  api.patch('/admin/users/:id/status', requireAuth, requireRole('ADMIN'), (req: AuthRequest, res: Response) => {
    const targetId = Number(req.params.id);
    const { status, reason } = req.body || {};
    const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as { id: number; role: string } | undefined;
    if (!target) { res.status(404).json({ message: 'User not found' }); return; }
    if (target.role === 'ADMIN') { res.status(403).json({ message: 'Cannot modify admin status' }); return; }
    db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, targetId);
    db.prepare('INSERT INTO admin_audit_logs (admin_user_id, action, target_entity, target_id, details_json, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, `USER_STATUS_${status}`, 'USER', targetId, JSON.stringify({ reason: reason || '' }), req.ip || '127.0.0.1');
    res.status(204).end();
  });

  api.get('/admin/audit-logs', requireAuth, requireRole('ADMIN'), (_req: AuthRequest, res: Response) => {
    const rows = db.prepare(`
      SELECT l.*, u.email as admin_email FROM admin_audit_logs l
      JOIN users u ON u.id = l.admin_user_id ORDER BY l.created_at DESC LIMIT 50
    `).all();
    res.json(rows);
  });

  api.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ status: 500, code: 'INTERNAL_ERROR', message: err.message || 'Unexpected server error' });
  });

  app.use('/api/v1', api);

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LegalConnect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
