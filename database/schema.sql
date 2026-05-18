-- =========================
-- 1. BRANCHES
-- =========================
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 2. USERS
-- =========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'warden')),
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. ROOMS
-- =========================
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    unit VARCHAR(50) NOT NULL,
    lorong VARCHAR(10) NOT NULL CHECK (lorong IN ('A', 'B')),
    room_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_id, unit, lorong, room_number)
);

-- =========================
-- 4. STUDENTS
-- =========================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NOT NULL UNIQUE,
    profile_image TEXT,
    dob DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female')),
    year_level VARCHAR(50),
    phone_number VARCHAR(30),
    address TEXT,
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(30),
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'graduated', 'suspended')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 5. ATTENDANCE
-- =========================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_type VARCHAR(20) NOT NULL
        CHECK (attendance_type IN ('check_in', 'check_out')),
    status VARCHAR(20) DEFAULT 'recorded'
        CHECK (status IN ('recorded', 'late', 'absent')),
    category VARCHAR(50) DEFAULT 'weekly',
    notes TEXT
);

-- =========================
-- 6. LOGS
-- =========================
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);