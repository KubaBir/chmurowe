DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS artists CASCADE;

CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('alltime', 'wrapped_2025')),
  chart_rank INTEGER NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  primary_genre TEXT NOT NULL,
  bpm INTEGER,
  release_year INTEGER,
  artist_country TEXT,
  streams_billions NUMERIC,
  duration_seconds INTEGER,
  peak_global_chart_position INTEGER,
  explicit BOOLEAN NOT NULL DEFAULT FALSE,
  danceability NUMERIC,
  energy NUMERIC,
  valence NUMERIC,
  acousticness NUMERIC,
  dataset_part TEXT
);

CREATE INDEX idx_songs_primary_genre ON songs (primary_genre);
CREATE INDEX idx_songs_artist ON songs (artist);

CREATE TABLE artists (
  id SERIAL PRIMARY KEY,
  chart_rank INTEGER NOT NULL,
  artist_name TEXT NOT NULL,
  monthly_listeners_millions NUMERIC,
  primary_genre TEXT,
  country TEXT,
  followers_millions NUMERIC,
  grammy_wins INTEGER,
  debut_year INTEGER,
  gender TEXT,
  top_2025_song TEXT,
  dataset_part TEXT
);
