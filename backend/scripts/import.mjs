import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`None of the expected paths exist: ${candidates.join(", ")}`);
}

function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function parseBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v) {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const schemaPath = resolveExistingPath([
    path.resolve(__dirname, "../db/schema.sql"),
    path.resolve(__dirname, "../../db/schema.sql"),
  ]);
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await client.query(schemaSql);

  const archiveDir = resolveExistingPath([
    path.resolve(__dirname, "../archive"),
    path.resolve(__dirname, "../../archive"),
  ]);

  const alltimePath = path.join(archiveDir, "spotify_alltime_top100_songs.csv");
  const wrappedSongsPath = path.join(archiveDir, "spotify_wrapped_2025_top50_songs.csv");
  const artistsPath = path.join(archiveDir, "spotify_wrapped_2025_top50_artists.csv");

  const alltimeRows = loadCsv(alltimePath);
  for (const row of alltimeRows) {
    await client.query(
      `INSERT INTO songs (
        source, chart_rank, song_title, artist, primary_genre, bpm, release_year, artist_country,
        streams_billions, duration_seconds, peak_global_chart_position, explicit,
        danceability, energy, valence, acousticness, dataset_part
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        "alltime",
        int(row.alltime_rank),
        row.song_title,
        row.artist,
        row.primary_genre,
        int(row.bpm),
        int(row.release_year),
        row.artist_country,
        num(row.total_streams_billions),
        null,
        null,
        parseBool(row.explicit),
        num(row.danceability),
        num(row.energy),
        num(row.valence),
        num(row.acousticness),
        row.dataset_part,
      ]
    );
  }

  const wrappedSongRows = loadCsv(wrappedSongsPath);
  for (const row of wrappedSongRows) {
    await client.query(
      `INSERT INTO songs (
        source, chart_rank, song_title, artist, primary_genre, bpm, release_year, artist_country,
        streams_billions, duration_seconds, peak_global_chart_position, explicit,
        danceability, energy, valence, acousticness, dataset_part
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        "wrapped_2025",
        int(row.wrapped_2025_rank),
        row.song_title,
        row.artist,
        row.primary_genre,
        int(row.bpm),
        int(row.release_year),
        row.artist_country,
        num(row.streams_2025_billions),
        int(row.duration_seconds),
        int(row.peak_global_chart_position),
        parseBool(row.explicit),
        num(row.danceability),
        num(row.energy),
        num(row.valence),
        num(row.acousticness),
        row.dataset_part,
      ]
    );
  }

  const artistRows = loadCsv(artistsPath);
  for (const row of artistRows) {
    await client.query(
      `INSERT INTO artists (
        chart_rank, artist_name, monthly_listeners_millions, primary_genre, country,
        followers_millions, grammy_wins, debut_year, gender, top_2025_song, dataset_part
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        int(row.wrapped_2025_rank),
        row.artist_name,
        num(row.monthly_listeners_millions_mar2026),
        row.primary_genre,
        row.country,
        num(row.followers_millions),
        int(row.grammy_wins),
        int(row.debut_year),
        row.gender,
        row.top_2025_song,
        row.dataset_part,
      ]
    );
  }

  const [{ count: songCount }] = (await client.query("SELECT COUNT(*)::int AS count FROM songs")).rows;
  const [{ count: artistCount }] = (await client.query("SELECT COUNT(*)::int AS count FROM artists")).rows;
  console.log(`Imported ${songCount} songs, ${artistCount} artists.`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
