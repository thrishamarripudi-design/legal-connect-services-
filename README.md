# LegalConnect — Digital Legal Services Marketplace & Case Assistance Platform

LegalConnect is an end-to-end digital legal services marketplace and case assistance platform connecting citizens with verified advocates, mediators, arbitrators, notaries, and legal consultants. It features an incentives-based onboarding model that rewards legal practitioners with merit points, reduced platform commissions, and higher search visibility for credential verification, timely consultation completion, pro-bono legal aid, and strong client ratings.

---

## Key Features

### 1. Citizen / Client Portal
- Register, sign in with JWT authentication, and manage personal profile.
- Search and filter verified providers by keyword, legal specialization, practitioner type, city, maximum fee, minimum experience, and weekday availability.
- View provider profiles, Bar Council / license credentials, offered services, merit tier, and verified client reviews.
- Book conflict-free consultation slots, complete test-mode Razorpay checkout, reschedule or cancel appointments, and leave reviews after completed consultations.
- Submit structured **Case Assistance Requests**, upload case documents with strict access control, and view payment receipts and notifications.

### 2. Legal Service Provider Console (Incentives-Based Onboarding)
- Multi-step onboarding: update practice details, upload Bar/practice credentials (`BAR_CERTIFICATE`, `DEGREE`, `GOVT_ID`, `PRACTICE_LICENSE`), and submit for administrator verification.
- **Merit & Incentive Tier Engine**:
  - `BRONZE` (0–249 pts): 15% platform fee
  - `SILVER` (250–499 pts): 11% platform fee + priority city placement
  - `GOLD` (500–749 pts): 8% platform fee + featured counsel visibility
  - `PLATINUM` (750+ pts): 5% platform fee + top merit ranking
- Create and manage service listings, configure weekly availability schedules, accept/reject/complete appointments, resolve assigned case requests, and inspect net payouts with Recharts visualizations.

### 3. Platform Administrator Console
- Review pending provider registrations and approve, reject, or request corrections with remarks.
- Monitor users and suspend/activate non-admin accounts.
- View platform analytics (registered users, verification pipeline, consultations, gross volume, and platform revenue) via Recharts charts.
- Audit every administrative decision in immutable `admin_audit_logs`.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React.js (JavaScript, functional components & hooks), React Router, Redux Toolkit, Axios, React Hook Form, Tailwind CSS, Recharts, Lucide Icons, Vite |
| **Backend (Java)** | Java 17, Spring Boot 3.3, Spring Web, Spring Data JPA / Hibernate, Spring Security (Stateless JWT + BCrypt), Bean Validation, JavaMailSender, Springdoc OpenAPI / Swagger |
| **Database (MySQL)** | MySQL 8 with Flyway schema & seed migrations (`V1__init_schema.sql`, `V2__seed_data.sql`) |
| **Local Server (Node.js)** | Node.js 22+, Express, `node:sqlite`, `bcryptjs`, `jsonwebtoken`, `multer` (`server.ts`) mirroring `/api/v1/*` |
| **DevOps & Testing** | Docker, Docker Compose, Maven, JUnit 5, Mockito, Postman Collection |

---

## Project Structure

```text
legalconnect/
├── backend/                          # Java 17 + Spring Boot 3.x + Maven API
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/legalconnect/
│       │   ├── config/               # SecurityConfig, OpenApiConfig
│       │   ├── controller/           # REST Controllers (/api/v1/*)
│       │   ├── dto/                  # Validated Request & Response DTOs
│       │   ├── entity/               # JPA Entities & Enums (14 tables)
│       │   ├── exception/            # GlobalExceptionHandler & ApiException
│       │   ├── repository/           # Spring Data JPA + Specification repositories
│       │   ├── security/             # JwtTokenProvider, JwtAuthenticationFilter
│       │   └── service/              # Transactional business & incentive services
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db/migration/         # Flyway V1__init_schema.sql, V2__seed_data.sql
│       └── test/java/com/legalconnect/ # Unit & workflow tests
├── docs/
│   └── LegalConnect_Postman_Collection.json
├── src/                              # React.js (JavaScript) Frontend
│   ├── api/                          # Axios client + domain API wrappers
│   ├── components/common/            # Navbar, Footer, DashboardLayout, ConfirmDialog, etc.
│   ├── pages/
│   │   ├── public/                   # LandingPage, MarketplacePage, ProviderDetailPage, Login, Register
│   │   ├── citizen/                  # CitizenDashboard
│   │   ├── provider/                 # ProviderDashboard
│   │   └── admin/                    # AdminDashboard
│   ├── store/                        # Redux Toolkit store & authSlice
│   └── utils/                        # Currency, date & status formatters
├── server.ts                         # Node.js + Express + SQLite API server
├── docker-compose.yml                # MySQL 8 + Spring Boot orchestration
├── .env.example                      # Environment variable template
└── package.json
```

---

## Prerequisites

Choose the run mode you prefer:

- **Option A — Node.js Full-Stack + React UI:**
  - Node.js `v22.5+` (uses built-in `node:sqlite`) and `npm`
- **Option B — Spring Boot 3 + MySQL 8:**
  - Docker & Docker Compose, **or** Java 17+, Maven 3.9+, and MySQL 8.0+

---

## Getting Started

### 1. Configure Environment Variables

```bash
cp .env.example .env
```

Update `.env` with your own secrets before deploying (never commit `.env` to version control). Key variables:
- `PORT=3000`
- `JWT_SECRET` (minimum 256-bit random string)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (for MySQL 8)
- `UPLOAD_DIR=./uploads`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` (optional SMTP for email notifications)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PAYMENT_MODE=mock`

---

### Option A: Run Full-Stack App (Node.js + React on Port 3000)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
- On first startup, `server.ts` automatically creates `legalconnect.db` (SQLite), applies all 14 normalized tables, and seeds sample users, providers, services, availability slots, appointments, payments, reviews, and audit logs.
- For production build & start:
  ```bash
  npm run build
  NODE_ENV=production npm start
  ```

---

### Option B: Run Spring Boot 3.x + MySQL 8 via Docker

```bash
docker compose up --build
```

- Spring Boot API runs on `http://localhost:8080`
- MySQL 8 runs on `localhost:3306` and Flyway automatically runs `V1__init_schema.sql` and `V2__seed_data.sql`
- Swagger / OpenAPI UI is available at `http://localhost:8080/swagger-ui.html`

To run the Spring Boot backend without Docker against a local MySQL 8 instance:

```bash
cd backend
mvn spring-boot:run
```

And start the React frontend pointed at `http://localhost:8080/api/v1`:

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1 npx vite --port 3000
```

---

## Seeded Test Accounts

All seeded accounts share the password: **`Password@123`**

| Role | Email | Notes |
|---|---|---|
| **Citizen** | `ananya.sharma@citizen.in` | Has past & upcoming consultations, case request, and payment receipts |
| **Citizen** | `vikram.rao@citizen.in` | Has completed family mediation consultation and open pro-bono request |
| **Verified Provider** | `arjun.mehta@legalconnect.in` | Platinum Tier (`860` pts, `5%` commission), Property & Consumer Law |
| **Verified Provider** | `kavita.nair@legalconnect.in` | Gold Tier (`620` pts, `8%` commission), Corporate & Arbitration |
| **Pending Provider** | `sanjay.verma@legalconnect.in` | Notary Public in `PENDING_REVIEW` state for testing Admin verification |
| **Platform Admin** | `admin@legalconnect.in` | Full access to verification queue, analytics, user governance, and audit logs |

---

## Testing & API Verification

### Frontend Build & Type Check
```bash
npm run lint
npm run build
```

### Spring Boot Unit Tests
```bash
cd backend
mvn test
```

### Postman Collection
Import `docs/LegalConnect_Postman_Collection.json` into Postman to test authentication, marketplace filtering, slot lookup, consultation booking, and admin analytics.

---

## Security Notes
- Passwords are hashed using **BCrypt** (cost factor 10).
- All protected routes validate stateless **JWT Bearer** tokens and enforce role-based access (`CITIZEN`, `PROVIDER`, `ADMIN`).
- Consultation booking checks slot overlap inside a database transaction (`PESSIMISTIC_WRITE` in JPA / `BEGIN IMMEDIATE` in SQLite) to prevent double-booking.
- Case documents require authenticated ownership (uploading citizen, assigned provider, or admin) before streaming downloads.
- Raw payment card details are never collected or stored; only gateway order/payment references and HMAC-verified receipts are persisted.
