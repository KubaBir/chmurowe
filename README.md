# Projekt chmurowe — Spotify (PostgreSQL + Express + React)

Monorepo na potrzeby zajęć: baza **PostgreSQL**, backend **Express** (REST), frontend **Vite + React + Tailwind**.

## Wymagania

- [Docker](https://www.docker.com/) (PostgreSQL w kontenerze)
- Node.js 20+ i npm

## Konfiguracja

1. Uruchom bazę:

   ```bash
   docker compose up -d
   ```

2. Backend — skopiuj [`backend/.env.example`](backend/.env.example) do `backend/.env` (domyślnie pasuje do `docker-compose.yml`).

3. Zaimportuj CSV z folderu [`archive/`](archive/):

   ```bash
   cd backend
   npm install
   npm run import
   ```

   Oczekiwany wynik: **150** utworów (100 all-time + 50 Wrapped 2025) i **50** artystów. Import odtwarza schemat (`db/schema.sql`) — **nadpisuje** istniejące tabele.

4. Frontend — skopiuj [`frontend/.env.example`](frontend/.env.example) do `frontend/.env` (adres API).

## Uruchomienie dev

W dwóch terminalach:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

- API: `http://localhost:3000`
- UI: adres z Vite (np. `http://localhost:5173`)

Opcjonalnie z katalogu głównego (wymaga `npm install` w root):

```bash
npm install
npm run dev
```

## API (skrót)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/songs` | Wszystkie utwory |
| `GET` | `/songs?primary_genre=...` | Filtr po gatunku (jeden parametr) |
| `GET` | `/songs?artist=...` | Filtr po artyście (jeden parametr) |
| `POST` | `/songs` | Dodanie utworu (JSON) |
| `PUT` | `/songs/:id` | Aktualizacja utworu |
| `GET` | `/stats/popular-genres?limit=20` | Najpopularniejsze gatunki (suma streamów) |
| `GET` | `/artists` | Lista artystów (Wrapped 2025) |

## Struktura

- [`db/schema.sql`](db/schema.sql) — definicja tabel `songs`, `artists`
- [`backend/`](backend/) — Express, skrypt importu `scripts/import.mjs`
- [`frontend/`](frontend/) — Vite + React + Tailwind
- [`archive/`](archive/) — źródłowe pliki CSV (Kaggle)

## Produkcja

```bash
cd frontend && npm run build
```

Statyczne pliki w `frontend/dist/` — do hostowania za reverse proxy lub CDN; backend uruchamiaj przez `npm start` w `backend/` z ustawionym `DATABASE_URL`.
