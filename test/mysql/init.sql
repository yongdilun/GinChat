-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ginchat;

-- Use the database
USE ginchat;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    is_login BOOLEAN DEFAULT FALSE,
    last_login_at DATETIME,
    heartbeat DATETIME,
    status ENUM('online', 'offline', 'away') DEFAULT 'offline',
    avatar_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some test users
-- Password is 'password123' hashed with bcrypt
INSERT INTO users (username, email, password, salt, role, status, created_at, updated_at)
VALUES 
    ('testuser1', 'test1@example.com', '$2a$10$1qAz2wSx3eDc4rFv5tGb5eT3TEMoaIZGxIWWsW8YvuoH.LVKmbYD.', '', 'member', 'offline', NOW(), NOW()),
    ('testuser2', 'test2@example.com', '$2a$10$1qAz2wSx3eDc4rFv5tGb5eT3TEMoaIZGxIWWsW8YvuoH.LVKmbYD.', '', 'member', 'offline', NOW(), NOW()),
    ('admin', 'admin@example.com', '$2a$10$1qAz2wSx3eDc4rFv5tGb5eT3TEMoaIZGxIWWsW8YvuoH.LVKmbYD.', '', 'admin', 'offline', NOW(), NOW());

-- Display the users
SELECT * FROM users;
