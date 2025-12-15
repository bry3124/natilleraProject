
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;
