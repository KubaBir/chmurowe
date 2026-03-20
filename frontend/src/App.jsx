import { useCallback, useEffect, useState } from "react";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";

const emptySongForm = {
  source: "wrapped_2025",
  chart_rank: "",
  song_title: "",
  artist: "",
  primary_genre: "",
  bpm: "",
  release_year: "",
  artist_country: "",
  streams_billions: "",
  duration_seconds: "",
  peak_global_chart_position: "",
  explicit: false,
  danceability: "",
  energy: "",
  valence: "",
  acousticness: "",
  dataset_part: "",
};

function rowToForm(row) {
  return {
    source: row.source,
    chart_rank: row.chart_rank ?? "",
    song_title: row.song_title ?? "",
    artist: row.artist ?? "",
    primary_genre: row.primary_genre ?? "",
    bpm: row.bpm ?? "",
    release_year: row.release_year ?? "",
    artist_country: row.artist_country ?? "",
    streams_billions: row.streams_billions ?? "",
    duration_seconds: row.duration_seconds ?? "",
    peak_global_chart_position: row.peak_global_chart_position ?? "",
    explicit: Boolean(row.explicit),
    danceability: row.danceability ?? "",
    energy: row.energy ?? "",
    valence: row.valence ?? "",
    acousticness: row.acousticness ?? "",
    dataset_part: row.dataset_part ?? "",
  };
}

function formToPayload(form) {
  return {
    source: form.source,
    chart_rank: Number(form.chart_rank),
    song_title: form.song_title,
    artist: form.artist,
    primary_genre: form.primary_genre,
    bpm: form.bpm === "" ? null : Number(form.bpm),
    release_year: form.release_year === "" ? null : Number(form.release_year),
    artist_country: form.artist_country || null,
    streams_billions:
      form.streams_billions === "" ? null : Number(form.streams_billions),
    duration_seconds:
      form.duration_seconds === "" ? null : Number(form.duration_seconds),
    peak_global_chart_position:
      form.peak_global_chart_position === ""
        ? null
        : Number(form.peak_global_chart_position),
    explicit: form.explicit,
    danceability:
      form.danceability === "" ? null : Number(form.danceability),
    energy: form.energy === "" ? null : Number(form.energy),
    valence: form.valence === "" ? null : Number(form.valence),
    acousticness:
      form.acousticness === "" ? null : Number(form.acousticness),
    dataset_part: form.dataset_part || null,
  };
}

export default function App() {
  const [songs, setSongs] = useState([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [filterInput, setFilterInput] = useState("");

  const [genreStats, setGenreStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [artists, setArtists] = useState([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState(null);
  const [showArtists, setShowArtists] = useState(false);

  const [addForm, setAddForm] = useState(() => ({ ...emptySongForm }));
  const [addMessage, setAddMessage] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(() => ({ ...emptySongForm }));
  const [editMessage, setEditMessage] = useState(null);

  const loadSongs = useCallback(async () => {
    setSongsLoading(true);
    setSongsError(null);
    try {
      let url = `${apiBase}/songs`;
      const q = filterInput.trim();
      if (filterType === "genre" && q) {
        url += `?primary_genre=${encodeURIComponent(q)}`;
      } else if (filterType === "artist" && q) {
        url += `?artist=${encodeURIComponent(q)}`;
      }
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setSongs(Array.isArray(data) ? data : []);
    } catch (e) {
      setSongsError(e.message || "Nie udało się pobrać utworów");
      setSongs([]);
    } finally {
      setSongsLoading(false);
    }
  }, [filterType, filterInput]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`${apiBase}/stats/popular-genres?limit=15`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setGenreStats(data.genres || []);
    } catch (e) {
      setStatsError(e.message || "Błąd statystyk");
      setGenreStats([]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadArtists = useCallback(async () => {
    setArtistsLoading(true);
    setArtistsError(null);
    try {
      const res = await fetch(`${apiBase}/artists`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setArtists(Array.isArray(data) ? data : []);
    } catch (e) {
      setArtistsError(e.message || "Błąd listy artystów");
      setArtists([]);
    } finally {
      setArtistsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (showArtists) loadArtists();
  }, [showArtists, loadArtists]);

  async function handleAddSubmit(e) {
    e.preventDefault();
    setAddMessage(null);
    try {
      const res = await fetch(`${apiBase}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(addForm)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setAddForm({ ...emptySongForm });
      setAddMessage("Dodano utwór.");
      loadSongs();
      loadStats();
    } catch (err) {
      setAddMessage(err.message || "Błąd zapisu");
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (editingId == null) return;
    setEditMessage(null);
    try {
      const res = await fetch(`${apiBase}/songs/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(editForm)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setEditMessage("Zapisano zmiany.");
      loadSongs();
      loadStats();
    } catch (err) {
      setEditMessage(err.message || "Błąd zapisu");
    }
  }

  function selectSongForEdit(row) {
    setEditingId(row.id);
    setEditForm(rowToForm(row));
    setEditMessage(null);
  }

  function clearEdit() {
    setEditingId(null);
    setEditForm({ ...emptySongForm });
    setEditMessage(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-10 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Spotify — dane z Kaggle
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          REST API (Express) + PostgreSQL. API:{" "}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-300">
            {apiBase}
          </code>
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-zinc-200">
          Najpopularniejsze gatunki
        </h2>
        <p className="mb-3 text-sm text-zinc-500">
          Według sumy streamów (mld) w tabeli utworów.
        </p>
        {statsLoading && (
          <p className="text-sm text-zinc-500">Ładowanie…</p>
        )}
        {statsError && (
          <p className="text-sm text-red-400">{statsError}</p>
        )}
        {!statsLoading && !statsError && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Gatunek</th>
                  <th className="px-3 py-2 font-medium">Liczba utworów</th>
                  <th className="px-3 py-2 font-medium">Suma streamów (mld)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {genreStats.map((g, i) => (
                  <tr key={g.primary_genre} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2 text-zinc-200">
                      {g.primary_genre}
                    </td>
                    <td className="px-3 py-2">{g.song_count}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {Number(g.total_streams_billions).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowArtists((v) => !v)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          {showArtists ? "Ukryj artystów" : "Top artyści (2025)"}
        </button>
        {showArtists && (
          <button
            type="button"
            onClick={loadArtists}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Odśwież
          </button>
        )}
      </div>

      {showArtists && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium text-zinc-200">
            Artyści (Wrapped 2025)
          </h2>
          {artistsLoading && (
            <p className="text-sm text-zinc-500">Ładowanie…</p>
          )}
          {artistsError && (
            <p className="text-sm text-red-400">{artistsError}</p>
          )}
          {!artistsLoading && !artistsError && (
            <div className="max-h-80 overflow-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-900/95 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Artysta</th>
                    <th className="px-3 py-2">Gatunek</th>
                    <th className="px-3 py-2">Słuchacze (mln)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {artists.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-900/50">
                      <td className="px-3 py-2 text-zinc-500">
                        {a.chart_rank}
                      </td>
                      <td className="px-3 py-2">{a.artist_name}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {a.primary_genre}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {a.monthly_listeners_millions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-medium text-zinc-200">Utwory</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Filtr</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">Wszystkie</option>
              <option value="genre">Gatunek (fragment)</option>
              <option value="artist">Artysta (fragment)</option>
            </select>
          </div>
          {filterType !== "all" && (
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">
                Wartość (jedno kryterium)
              </label>
              <input
                type="text"
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                placeholder={
                  filterType === "genre" ? "np. Pop" : "np. Drake"
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
          )}
          <button
            type="button"
            onClick={loadSongs}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Odśwież listę
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Przy „Wszystkie” ignorowany jest tekst filtra. Przy gatunku/artyście
          backend przyjmuje tylko jeden parametr naraz.
        </p>
      </section>

      {songsLoading && (
        <p className="text-sm text-zinc-500">Ładowanie utworów…</p>
      )}
      {songsError && (
        <p className="mb-4 text-sm text-red-400">{songsError}</p>
      )}

      {!songsLoading && !songsError && (
        <div className="mb-10 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-zinc-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Źródło</th>
                <th className="px-2 py-2">Tytuł</th>
                <th className="px-2 py-2">Artysta</th>
                <th className="px-2 py-2">Gatunek</th>
                <th className="px-2 py-2">Streamy (mld)</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {songs.map((s) => (
                <tr
                  key={s.id}
                  className={
                    editingId === s.id
                      ? "bg-emerald-950/40"
                      : "hover:bg-zinc-900/50"
                  }
                >
                  <td className="px-2 py-2 text-zinc-500">{s.id}</td>
                  <td className="px-2 py-2 text-zinc-400">{s.source}</td>
                  <td className="px-2 py-2">{s.song_title}</td>
                  <td className="px-2 py-2">{s.artist}</td>
                  <td className="px-2 py-2 text-zinc-400">{s.primary_genre}</td>
                  <td className="px-2 py-2 tabular-nums">{s.streams_billions}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => selectSongForEdit(s)}
                      className="text-emerald-400 hover:underline"
                    >
                      Edytuj
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium text-zinc-200">
            Dodaj utwór (POST)
          </h2>
          <SongForm
            form={addForm}
            setForm={setAddForm}
            onSubmit={handleAddSubmit}
            submitLabel="Dodaj"
            message={addMessage}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-zinc-200">
              Edytuj utwór (PUT)
            </h2>
            {editingId != null && (
              <button
                type="button"
                onClick={clearEdit}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Anuluj wybór
              </button>
            )}
          </div>
          {editingId == null && (
            <p className="text-sm text-zinc-500">
              Wybierz „Edytuj” przy wierszu w tabeli.
            </p>
          )}
          {editingId != null && (
            <SongForm
              form={editForm}
              setForm={setEditForm}
              onSubmit={handleEditSubmit}
              submitLabel={`Zapisz #${editingId}`}
              message={editMessage}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function SongForm({ form, setForm, onSubmit, submitLabel, message }) {
  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Źródło">
          <select
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            required
          >
            <option value="alltime">alltime</option>
            <option value="wrapped_2025">wrapped_2025</option>
          </select>
        </Field>
        <Field label="Pozycja w rankingu">
          <input
            type="number"
            value={form.chart_rank}
            onChange={(e) => set("chart_rank", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            required
          />
        </Field>
        <Field label="Tytuł">
          <input
            value={form.song_title}
            onChange={(e) => set("song_title", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            required
          />
        </Field>
        <Field label="Artysta">
          <input
            value={form.artist}
            onChange={(e) => set("artist", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            required
          />
        </Field>
        <Field label="Gatunek">
          <input
            value={form.primary_genre}
            onChange={(e) => set("primary_genre", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            required
          />
        </Field>
        <Field label="BPM">
          <input
            type="number"
            value={form.bpm}
            onChange={(e) => set("bpm", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Rok">
          <input
            type="number"
            value={form.release_year}
            onChange={(e) => set("release_year", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Kraj artysty">
          <input
            value={form.artist_country}
            onChange={(e) => set("artist_country", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Streamy (mld)">
          <input
            type="number"
            step="any"
            value={form.streams_billions}
            onChange={(e) => set("streams_billions", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Czas trwania (s)">
          <input
            type="number"
            value={form.duration_seconds}
            onChange={(e) => set("duration_seconds", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Szczyt na liście">
          <input
            type="number"
            value={form.peak_global_chart_position}
            onChange={(e) =>
              set("peak_global_chart_position", e.target.value)
            }
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Explicit">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.explicit}
              onChange={(e) => set("explicit", e.target.checked)}
            />
            Tak
          </label>
        </Field>
        <Field label="Danceability">
          <input
            type="number"
            step="any"
            value={form.danceability}
            onChange={(e) => set("danceability", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Energy">
          <input
            type="number"
            step="any"
            value={form.energy}
            onChange={(e) => set("energy", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Valence">
          <input
            type="number"
            step="any"
            value={form.valence}
            onChange={(e) => set("valence", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Acousticness">
          <input
            type="number"
            step="any"
            value={form.acousticness}
            onChange={(e) => set("acousticness", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Dataset (opis)" className="sm:col-span-2">
          <input
            value={form.dataset_part}
            onChange={(e) => set("dataset_part", e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </Field>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {submitLabel}
      </button>
      {message && (
        <p
          className={
            message.startsWith("Błąd") || message.includes("error")
              ? "text-sm text-red-400"
              : "text-sm text-emerald-400"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
