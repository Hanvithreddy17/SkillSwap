# SkillSwap — Student Skill Exchange Platform

**SkillSwap** is a peer-to-peer Full Stack Development (FSD) college project designed to empower students to exchange academic, technical, and creative skills without monetary transactions.

- **Example**: Student A (Priya) can teach Python and wants to learn Video Editing. Student B (Rohan) can teach Video Editing and wants to learn Python. SkillSwap connects them through automated **Reciprocal Skill Matching**, exchange requests, study session scheduling, and peer reviews.

---

## 1. Technology Stack

- **Frontend**:
  - HTML5 (Semantic, standard tags)
  - CSS3 (Vanilla CSS, light-mode palette with navy, purple `#4f46e5`, and blue `#2563eb` accents)
  - Vanilla JavaScript (Native `fetch()`, modular DOM updates, no frontend frameworks)
- **Backend**:
  - Node.js (v18+)
  - Express.js
- **Database**:
  - MySQL Server (v8.0+)
  - Connectivity: `mysql2/promise` (connection pooling with parameterized queries)
- **Security & Authentication**:
  - `bcryptjs` (secure password hashing)
  - `express-session` (cookie-based session state management)
  - Built-in CSRF protection header (`X-CSRF-Token`)
  - Server-side validation and ownership checks
  - `dotenv` for environment configuration

---

## 2. Project Architecture & Directory Structure

```text
skillswap/
├── frontend/                     # Pure HTML5, CSS3, Vanilla JS
│   ├── index.html                # Landing & features page
│   ├── register.html             # Student registration
│   ├── login.html                # Student login (with 1-click demo buttons)
│   ├── dashboard.html            # Metrics, recent activity, mutual match banner
│   ├── explore.html              # Skill discovery, search, reciprocal matching tab
│   ├── my-skills.html            # Add/delete offered and wanted skills
│   ├── exchanges.html            # Incoming & outgoing exchange requests
│   ├── sessions.html             # Schedule sessions, mark completed & review
│   ├── profile.html              # Public/private student profile with star reviews
│   ├── css/
│   │   └── style.css             # Unified responsive stylesheet
│   └── js/
│       ├── api.js                # Fetch wrapper, CSRF handler & toasts
│       ├── auth.js               # Session verification & navbar state
│       ├── dashboard.js          # Dashboard metric cards & activity
│       ├── explore.js            # Skill cards, search & reciprocal match logic
│       ├── my-skills.js          # Catalog & user skill management
│       ├── exchanges.js          # Request acceptance, rejection & cancellation
│       ├── sessions.js           # Study sessions & peer rating modal
│       └── profile.js            # Profile rendering & feedback history
├── backend/                      # Node.js & Express API Server
│   ├── config/
│   │   └── db.js                 # MySQL2 connection pool
│   ├── middleware/
│   │   └── auth.js               # Session guard & CSRF verification
│   ├── routes/
│   │   ├── authRoutes.js         # Register, login, logout, me, CSRF
│   │   ├── userRoutes.js         # Student profiles & bio editing
│   │   ├── skillRoutes.js        # Catalog, user skills & explore query
│   │   ├── matchRoutes.js        # Reciprocal 2-way skill matching algorithm
│   │   ├── requestRoutes.js      # Exchange request lifecycle
│   │   ├── sessionRoutes.js      # Session coordination
│   │   └── reviewRoutes.js       # 1-5 star peer reviews
│   ├── server.js                 # Express server & static frontend serving
│   ├── package.json              # Backend dependencies
│   ├── .env.example              # Environment variables template
│   └── .env                      # Local environment credentials
├── database/
│   └── schema.sql                # MySQL DDL (6 tables) & sample seed records
└── README.md                     # Complete documentation & viva setup guide
```

---

## 3. Step-by-Step Installation & Setup (Windows)

### Step 1: Prerequisites
Ensure you have the following installed:
1. **Node.js** (v18 or higher): Download from [nodejs.org](https://nodejs.org).
2. **MySQL Server** (v8.0+ or XAMPP): Ensure the MySQL service is running.

### Step 2: Database Setup
1. Open PowerShell or Command Prompt.
2. Log into the MySQL command line client:
   ```powershell
   mysql -u root -p
   ```
   *(Enter your MySQL root password when prompted)*
3. Execute the database schema script:
   ```sql
   source C:/Users/hanvi/OneDrive/Desktop/fsd/skillswap/database/schema.sql;
   ```
   *(Or import `database/schema.sql` inside MySQL Workbench or phpMyAdmin)*

4. Verify that 6 tables are created:
   ```sql
   USE skillswap;
   SHOW TABLES;
   ```
   Tables: `users`, `skills`, `user_skills`, `exchange_requests`, `sessions`, `reviews`.

### Step 3: Configure Environment Variables
Inside `skillswap/backend/`, open `.env` (or copy from `.env.example`):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=skillswap
DB_PORT=3306

PORT=3000
SESSION_SECRET=skillswap_super_secret_session_key_2026
NODE_ENV=development
```

### Step 4: Install Dependencies & Run the Server
1. Navigate to the `backend` folder:
   ```powershell
   cd C:\Users\hanvi\OneDrive\Desktop\fsd\skillswap\backend
   ```
2. Install the required npm packages:
   ```powershell
   npm install
   ```
3. Start the Express server:
   ```powershell
   npm start
   ```
   *(Or `node server.js`)*

You will see:
```text
====================================================
 SkillSwap Server is running successfully!
 Local URL: http://localhost:3000
 Static Frontend: .../skillswap/frontend
====================================================
[Database] Connected successfully to MySQL database "skillswap" on port 3306
```

### Step 5: Open in Your Browser
Open your browser and navigate to:
**`http://localhost:3000`**

---

## 4. Pre-configured Demo Accounts

All sample student accounts share the same default password: **`student123`**
(You can also use the **One-Click Demo Fill buttons** directly on the Login page):

| Student Name | Email | Department | Offered Skills | Wanted Skills |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Sharma** | `priya@college.edu` | Computer Science (3rd Yr) | Python, SQL | Video Editing, UI/UX Design |
| **Rohan Patel** | `rohan@college.edu` | IT (3rd Yr) | Premiere Pro, Graphic Design | Python, SQL |
| **Ananya Verma** | `ananya@college.edu` | Electronics (2nd Yr) | UI/UX (Figma) | Web Development |
| **Amit Kumar** | `amit@college.edu` | Mechanical (4th Yr) | Public Speaking | Engineering Math, Python |

---

## 5. How to Test Every Feature End-to-End

### Flow 1: Reciprocal Matching Demonstration
1. Go to `http://localhost:3000/login.html`.
2. Click **"Priya (Python & Reciprocal Match)"** and click **Log In**.
3. Notice the **Dashboard alert banner**: *"Great News! You have 1 instant reciprocal match!"*.
4. Navigate to **Explore Skills** and click the **"🎯 Reciprocal Matches"** tab.
5. See **Rohan Patel** matched directly:
   - You teach: **Python Programming**
   - Rohan teaches: **Video Editing (Premiere Pro)**
6. Click **"Connect & Swap"** or manage the existing active request.

### Flow 2: Student Registration & Authentication
1. Click **Logout** from the navigation bar.
2. Click **Register** and fill in your own name, college email, password, department, and year of study.
3. Submit the form: the server verifies email uniqueness, hashes the password with `bcrypt`, creates a secure session, and redirects to your customized dashboard.

### Flow 3: Managing Skills (Offered & Wanted)
1. Go to **My Skills** (`my-skills.html`).
2. Select a skill from the categorized catalog (e.g., *Web Development*, *Acoustic Guitar*, or choose *Add custom skill...*).
3. Select whether you can **Teach** it or want to **Learn** it, choose your proficiency level, and click **Add Skill to Profile**.
4. Test removing a skill using the **Remove** button.

### Flow 4: Sending & Responding to Exchange Requests
1. Log in as **Ananya** (`ananya@college.edu` / `student123`).
2. Go to **Explore Skills** and click **Request Swap** on any peer's skill.
3. Select which of your offered skills you want to trade in return and submit.
4. Log out and log in as the recipient to **Accept** or **Reject** the request on the **Exchanges** page.

### Flow 5: Scheduling Study Sessions & Writing Peer Reviews
1. Go to **Sessions** (`sessions.html`).
2. Pick any **Accepted** exchange from the dropdown.
3. Select the session date, time, duration (e.g., 60 mins), and meeting mode (*Online* with Google Meet link or *In Person*).
4. Click **Schedule Session**.
5. Once a session has taken place, click **Mark Completed**.
6. Click **⭐ Write Review**, rate the partner from 1 to 5 stars, and submit written feedback.
7. Open **Profile** (`profile.html`) to view the newly calculated average rating and feedback displayed on the student's profile!

---

## 6. Database Schema Design (MySQL)

1. **`users`**: `user_id` (PK), `name`, `email` (UNIQUE), `password_hash`, `department`, `year_of_study`, `bio`, `created_at`.
2. **`skills`**: `skill_id` (PK), `skill_name` (UNIQUE), `category`, `description`.
3. **`user_skills`**: `user_skill_id` (PK), `user_id` (FK -> users), `skill_id` (FK -> skills), `skill_type` (`OFFER` / `LEARN`), `proficiency_level`, `created_at`. Unique constraint on `(user_id, skill_id, skill_type)`.
4. **`exchange_requests`**: `request_id` (PK), `requester_id` (FK), `recipient_id` (FK), `requested_skill_id` (FK -> user_skills), `offered_skill_id` (FK -> user_skills), `message`, `status` (`Pending`, `Accepted`, `Rejected`, `Cancelled`), `created_at`, `updated_at`.
5. **`sessions`**: `session_id` (PK), `request_id` (FK -> exchange_requests), `scheduled_at`, `duration_minutes`, `meeting_mode` (`Online`, `In Person`), `meeting_details`, `status` (`Scheduled`, `Completed`, `Cancelled`), `created_at`.
6. **`reviews`**: `review_id` (PK), `session_id` (FK -> sessions), `reviewer_id` (FK), `reviewee_id` (FK), `rating` (1-5), `comment`, `created_at`. Unique constraint on `(session_id, reviewer_id)`.

---

## 7. Troubleshooting Common Database & Connection Issues

- **`Access denied for user 'root'@'localhost'`**:
  Verify the password set in `skillswap/backend/.env` matches your MySQL root password.
- **`ECONNREFUSED 127.0.0.1:3306`**:
  Ensure the MySQL Windows service is running. Open PowerShell as Administrator and run `Start-Service MySQL80` (or start MySQL in XAMPP Control Panel).
- **`Unknown database 'skillswap'`**:
  Run `database/schema.sql` in MySQL to initialize the database and tables.
- **`Port 3000 in use`**:
  Change `PORT=3001` inside `skillswap/backend/.env`.
