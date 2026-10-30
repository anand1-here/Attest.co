-- PostgreSQL schema. Safe to re-run.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_metadata (
  id                   SERIAL PRIMARY KEY,
  case_id              VARCHAR(64) NOT NULL,
  evidence_id          VARCHAR(64) NOT NULL UNIQUE,
  file_path            TEXT        NOT NULL,
  file_hash            CHAR(64)    NOT NULL,
  submitted_by         INTEGER REFERENCES users(id),
  tx_hash              VARCHAR(80),
  block_number         INTEGER,
  deepfake_status      VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                         CHECK (deepfake_status IN ('PENDING', 'DONE', 'ERROR', 'SKIPPED')),
  avg_probability      DOUBLE PRECISION,
  prediction           VARCHAR(10),
  deepfake_error       TEXT,
  deepfake_analyzed_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_metadata(case_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  action     TEXT        NOT NULL,
  status     INTEGER     NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
