import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
app.use(cors());
app.use(express.json());

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

app.get("/songs", async (req, res) => {
  const { primary_genre: primaryGenre, artist } = req.query;
  const hasGenre = primaryGenre != null && String(primaryGenre).trim() !== "";
  const hasArtist = artist != null && String(artist).trim() !== "";

  if (hasGenre && hasArtist) {
    return badRequest(res, "Use only one filter: primary_genre or artist");
  }

  try {
    if (hasGenre) {
      const result = await pool.query(
        "SELECT * FROM songs WHERE primary_genre ILIKE $1 ORDER BY id",
        [`%${String(primaryGenre).trim()}%`]
      );
      return res.json(result.rows);
    }
    if (hasArtist) {
      const result = await pool.query(
        "SELECT * FROM songs WHERE artist ILIKE $1 ORDER BY id",
        [`%${String(artist).trim()}%`]
      );
      return res.json(result.rows);
    }
    const result = await pool.query("SELECT * FROM songs ORDER BY id");
    return res.json(result.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error" });
  }
});

app.post("/songs", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return badRequest(res, "JSON body required");
  }
  if (!["alltime", "wrapped_2025"].includes(body.source)) {
    return badRequest(res, "source must be alltime or wrapped_2025");
  }
  const required = ["chart_rank", "song_title", "artist", "primary_genre"];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return badRequest(res, `Missing required field: ${k}`);
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO songs (
        source, chart_rank, song_title, artist, primary_genre, bpm, release_year, artist_country,
        streams_billions, duration_seconds, peak_global_chart_position, explicit,
        danceability, energy, valence, acousticness, dataset_part
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        body.source,
        Number(body.chart_rank),
        String(body.song_title),
        String(body.artist),
        String(body.primary_genre),
        body.bpm != null ? Number(body.bpm) : null,
        body.release_year != null ? Number(body.release_year) : null,
        body.artist_country ?? null,
        body.streams_billions != null ? Number(body.streams_billions) : null,
        body.duration_seconds != null ? Number(body.duration_seconds) : null,
        body.peak_global_chart_position != null ? Number(body.peak_global_chart_position) : null,
        Boolean(body.explicit),
        body.danceability != null ? Number(body.danceability) : null,
        body.energy != null ? Number(body.energy) : null,
        body.valence != null ? Number(body.valence) : null,
        body.acousticness != null ? Number(body.acousticness) : null,
        body.dataset_part ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error" });
  }
});

app.put("/songs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return badRequest(res, "Invalid id");
  }
  const body = req.body;
  if (!body || typeof body !== "object") {
    return badRequest(res, "JSON body required");
  }
  if (!["alltime", "wrapped_2025"].includes(body.source)) {
    return badRequest(res, "source must be alltime or wrapped_2025");
  }

  for (const k of ["chart_rank", "song_title", "artist", "primary_genre"]) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return badRequest(res, `Missing required field: ${k}`);
    }
  }

  try {
    const result = await pool.query(
      `UPDATE songs SET
        source = $1, chart_rank = $2, song_title = $3, artist = $4, primary_genre = $5,
        bpm = $6, release_year = $7, artist_country = $8, streams_billions = $9,
        duration_seconds = $10, peak_global_chart_position = $11, explicit = $12,
        danceability = $13, energy = $14, valence = $15, acousticness = $16, dataset_part = $17
      WHERE id = $18
      RETURNING *`,
      [
        body.source,
        Number(body.chart_rank),
        String(body.song_title),
        String(body.artist),
        String(body.primary_genre),
        body.bpm != null ? Number(body.bpm) : null,
        body.release_year != null ? Number(body.release_year) : null,
        body.artist_country ?? null,
        body.streams_billions != null ? Number(body.streams_billions) : null,
        body.duration_seconds != null ? Number(body.duration_seconds) : null,
        body.peak_global_chart_position != null ? Number(body.peak_global_chart_position) : null,
        Boolean(body.explicit),
        body.danceability != null ? Number(body.danceability) : null,
        body.energy != null ? Number(body.energy) : null,
        body.valence != null ? Number(body.valence) : null,
        body.acousticness != null ? Number(body.acousticness) : null,
        body.dataset_part ?? null,
        id,
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Song not found" });
    }
    return res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error" });
  }
});

app.get("/stats/popular-genres", async (req, res) => {
  let limit = parseInt(String(req.query.limit ?? "20"), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  try {
    const result = await pool.query(
      `SELECT
        primary_genre,
        COUNT(*)::int AS song_count,
        COALESCE(SUM(streams_billions), 0)::float8 AS total_streams_billions
      FROM songs
      GROUP BY primary_genre
      ORDER BY total_streams_billions DESC NULLS LAST, song_count DESC, primary_genre ASC
      LIMIT $1`,
      [limit]
    );
    return res.json({ genres: result.rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error" });
  }
});

app.get("/artists", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM artists ORDER BY chart_rank");
    return res.json(result.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
