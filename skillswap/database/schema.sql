-- ====================================================================
-- SkillSwap — Student Skill Exchange Platform
-- Database Schema & Sample Seed Data
-- ====================================================================

CREATE DATABASE IF NOT EXISTS skillswap;
USE skillswap;

-- --------------------------------------------------------------------
-- 1. Users Table
-- Stores student accounts with academic details and bio
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  year_of_study VARCHAR(50) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 2. Skills Catalog Table
-- Master list of predefined skills categorized across disciplines
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  skill_id INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 3. User Skills Table
-- Skills a student offers to teach or wants to learn
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_skills (
  user_skill_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  skill_type ENUM('OFFER', 'LEARN') NOT NULL,
  proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) 
    REFERENCES skills(skill_id) ON DELETE RESTRICT,
  CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id, skill_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 4. Exchange Requests Table
-- Skill exchange requests sent between two students
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  requested_skill_id INT NOT NULL,
  offered_skill_id INT NOT NULL,
  message TEXT,
  status ENUM('Pending', 'Accepted', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_requester FOREIGN KEY (requester_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_req_recipient FOREIGN KEY (recipient_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_req_requested_skill FOREIGN KEY (requested_skill_id) 
    REFERENCES user_skills(user_skill_id) ON DELETE CASCADE,
  CONSTRAINT fk_req_offered_skill FOREIGN KEY (offered_skill_id) 
    REFERENCES user_skills(user_skill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 5. Sessions Table
-- Scheduled peer-to-peer learning sessions for accepted requests
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  meeting_mode ENUM('Online', 'In Person') NOT NULL,
  meeting_details TEXT,
  status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_request FOREIGN KEY (request_id) 
    REFERENCES exchange_requests(request_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 6. Reviews Table
-- Feedback and 1-5 star ratings given after a completed session
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  reviewee_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_session FOREIGN KEY (session_id) 
    REFERENCES sessions(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewee FOREIGN KEY (reviewee_id) 
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT uq_session_reviewer UNIQUE (session_id, reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- SEED DATA: Predefined Skills Catalog
-- ====================================================================
INSERT INTO skills (skill_name, category, description) VALUES
-- Programming
('Python Programming', 'Programming', 'Core Python, scripting, data handling and automation.'),
('Java Programming', 'Programming', 'Object-Oriented Programming, Java collections and backend logic.'),
('C++ & Algorithms', 'Programming', 'Data structures, algorithm design and competitive coding.'),
('Web Development (HTML/CSS/JS)', 'Programming', 'Frontend website building with HTML5, CSS3 and modern JavaScript.'),
('SQL & Database Management', 'Programming', 'Relational database modeling, query writing and indexing.'),
('Machine Learning Basics', 'Programming', 'Introductory predictive modeling, scikit-learn and pandas.'),

-- Design
('UI/UX Design with Figma', 'Design', 'Wireframing, prototyping and interface design systems.'),
('Graphic Design & Photoshop', 'Design', 'Poster design, photo manipulation and digital art.'),
('Logo & Brand Identity', 'Design', 'Vector branding, color psychology and typography.'),
('3D Modeling in Blender', 'Design', 'Basic 3D object modeling, lighting and rendering.'),

-- Video Editing
('Adobe Premiere Pro', 'Video Editing', 'Timeline editing, audio syncing, color grading and transitions.'),
('DaVinci Resolve', 'Video Editing', 'Professional color correction, video cutting and rendering.'),
('Short-Form Video & Reels', 'Video Editing', 'Engaging pacing, subtitles, captions and social media editing.'),

-- Communication
('Public Speaking & Presentations', 'Communication', 'Stage presence, speech delivery and slide presentation skills.'),
('Technical Writing & Reports', 'Communication', 'Writing structured engineering reports, documentation and resumes.'),
('Campus Placement Interview Prep', 'Communication', 'HR questions, group discussions and mock interviews.'),

-- Academics
('Engineering Mathematics', 'Academics', 'Linear algebra, calculus and differential equations.'),
('Digital Electronics', 'Academics', 'Logic gates, Boolean algebra, flip-flops and counters.'),
('Probability & Statistics', 'Academics', 'Descriptive statistics, distributions and hypothesis testing.'),

-- Other
('Acoustic Guitar', 'Other', 'Basic chords, strumming patterns and fingerpicking.'),
('Chess Strategy & Tactics', 'Other', 'Opening principles, tactical motifs and endgame play.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ====================================================================
-- SEED DATA: Sample Students
-- All sample accounts use password: 'student123'
-- Bcrypt hash for 'student123' (10 rounds):
-- $2b$10$7ZkQy7nN4WJb0cO24tK/4uQo3hI2o7M.U2fE89jW11b/5R/u9g7C2
-- (or generated hash compatible with bcrypt)
-- ====================================================================

-- Clear existing sample data to allow re-running schema cleanly
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE reviews;
TRUNCATE TABLE sessions;
TRUNCATE TABLE exchange_requests;
TRUNCATE TABLE user_skills;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert 4 sample students from different departments
-- Note: password for all sample accounts is 'student123'
INSERT INTO users (user_id, name, email, password_hash, department, year_of_study, bio) VALUES
(1, 'Priya Sharma', 'priya@college.edu', '$2a$10$2A3XD3HLeNP0NfG1F3PtK.7Rf7QlElyydi2yvEaAN.PS0SBM2225C', 'Computer Science', '3rd Year', 'Passionate about Python programming and machine learning. Looking forward to learning video editing for my tech YouTube channel!'),
(2, 'Rohan Patel', 'rohan@college.edu', '$2a$10$2A3XD3HLeNP0NfG1F3PtK.7Rf7QlElyydi2yvEaAN.PS0SBM2225C', 'Information Technology', '3rd Year', 'Video creator and editor with 2 years of Premiere Pro experience. Eager to master Python for web scraping and backend tasks.'),
(3, 'Ananya Verma', 'ananya@college.edu', '$2a$10$2A3XD3HLeNP0NfG1F3PtK.7Rf7QlElyydi2yvEaAN.PS0SBM2225C', 'Electronics & Comm.', '2nd Year', 'Love crafting UI/UX interfaces in Figma. Want to learn Web Development (HTML/CSS/JS) to bring my designs to life.'),
(4, 'Amit Kumar', 'amit@college.edu', '$2a$10$2A3XD3HLeNP0NfG1F3PtK.7Rf7QlElyydi2yvEaAN.PS0SBM2225C', 'Mechanical Engineering', '4th Year', 'Proficient in Public Speaking and presentation skills. Seeking guidance in Engineering Mathematics for GATE preparation.');

-- Re-assign user_skills for testing reciprocal matching:
-- Priya (User 1) OFFERS Python (Skill 1) & WANTS Video Editing (Skill 11)
-- Rohan (User 2) OFFERS Video Editing (Skill 11) & WANTS Python (Skill 1)
-- -> PERFECT RECIPROCAL MATCH!
-- Priya also OFFERS SQL (Skill 5) & WANTS UI/UX Design (Skill 7)
-- Ananya (User 3) OFFERS UI/UX Design (Skill 7) & WANTS Web Dev (Skill 4)
-- Amit (User 4) OFFERS Public Speaking (Skill 14) & WANTS Engineering Math (Skill 17)

INSERT INTO user_skills (user_skill_id, user_id, skill_id, skill_type, proficiency_level) VALUES
(1, 1, 1, 'OFFER', 'Advanced'),     -- Priya offers Python
(2, 1, 5, 'OFFER', 'Intermediate'), -- Priya offers SQL
(3, 1, 11, 'LEARN', 'Beginner'),    -- Priya wants Video Editing
(4, 1, 7, 'LEARN', 'Beginner'),     -- Priya wants UI/UX Design

(5, 2, 11, 'OFFER', 'Advanced'),    -- Rohan offers Video Editing
(6, 2, 8, 'OFFER', 'Intermediate'), -- Rohan offers Graphic Design
(7, 2, 1, 'LEARN', 'Beginner'),     -- Rohan wants Python
(8, 2, 5, 'LEARN', 'Intermediate'), -- Rohan wants SQL

(9, 3, 7, 'OFFER', 'Advanced'),     -- Ananya offers UI/UX Design
(10, 3, 4, 'LEARN', 'Beginner'),    -- Ananya wants Web Dev

(11, 4, 14, 'OFFER', 'Advanced'),   -- Amit offers Public Speaking
(12, 4, 17, 'LEARN', 'Intermediate');-- Amit wants Engg Math

-- Insert sample exchange requests:
-- Request 1: Rohan requested Priya (Rohan offers Video Editing (user_skill 5), wants Python (user_skill 1))
-- Status: Accepted
INSERT INTO exchange_requests (request_id, requester_id, recipient_id, requested_skill_id, offered_skill_id, message, status) VALUES
(1, 2, 1, 1, 5, 'Hey Priya! I saw you want to learn Premiere Pro video editing. I can teach you video cutting and pacing if you can teach me Python basics!', 'Accepted');

-- Request 2: Ananya requested Priya (Ananya offers UI/UX (user_skill 9), wants SQL (user_skill 2))
-- Status: Pending
INSERT INTO exchange_requests (request_id, requester_id, recipient_id, requested_skill_id, offered_skill_id, message, status) VALUES
(2, 3, 1, 2, 9, 'Hi Priya, I would love to learn SQL for my portfolio app project. I can teach you Figma wireframing in exchange!', 'Pending');

-- Sample Scheduled Session for Accepted Request 1
INSERT INTO sessions (session_id, request_id, scheduled_at, duration_minutes, meeting_mode, meeting_details, status) VALUES
(1, 1, '2026-10-25 15:00:00', 60, 'Online', 'Google Meet: meet.google.com/xyz-skill-swap (Topic: Python Loops & Video Timeline Basics)', 'Scheduled');

-- Sample Completed Session and Review (To demonstrate review functionality)
-- Let's add session 2 as Completed between Amit and Priya for Public Speaking
INSERT INTO user_skills (user_skill_id, user_id, skill_id, skill_type, proficiency_level) VALUES
(13, 4, 1, 'LEARN', 'Beginner'); -- Amit wants Python

INSERT INTO exchange_requests (request_id, requester_id, recipient_id, requested_skill_id, offered_skill_id, message, status) VALUES
(3, 4, 1, 1, 11, 'Hi Priya, would love to exchange public speaking tips for Python intro.', 'Accepted');

INSERT INTO sessions (session_id, request_id, scheduled_at, duration_minutes, meeting_mode, meeting_details, status) VALUES
(2, 3, '2026-10-10 11:00:00', 45, 'In Person', 'Central Campus Library, Group Study Room 3B', 'Completed');

INSERT INTO reviews (review_id, session_id, reviewer_id, reviewee_id, rating, comment) VALUES
(1, 2, 4, 1, 5, 'Priya was an outstanding tutor! She explained Python variables, functions and loops with great real-life analogies. Highly recommended!');
