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

## Kubernetes (kind)

Wymagania: [kind](https://kind.sigs.k8s.io/), [kubectl](https://kubernetes.io/docs/tasks/tools/), Docker.

### Uruchomienie

```bash
# 1. Utwórz lokalny klaster (mapuje porty 30000→8080 i 30001→3000)
kind create cluster --config=kind-cluster.yaml

# 2. Zbuduj obrazy
docker build -t spotify-backend ./backend
docker build -t spotify-frontend ./frontend

# 3. Załaduj obrazy do klastra
kind load docker-image spotify-backend
kind load docker-image spotify-frontend

# 4. Utwórz ConfigMap ze schematu bazy (czyta db/schema.sql)
kubectl create configmap db-init-config --from-file=01-schema.sql=./db/schema.sql

# 5. Aplikuj manifesty (kolejność ważna)
kubectl apply -f k8s/db.yaml
kubectl wait --for=condition=ready pod/db-pod --timeout=120s

# 6. Aplikuj backend i frontend
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

Po uruchomieniu:

- UI: `http://localhost:8080`
- API: `http://localhost:3000`

### Diagnostyka

```bash
kubectl get pods              # status wszystkich podów
kubectl get services          # lista serwisów i portów
kubectl logs backend-pod      # logi backendu
kubectl describe pod db-pod   # szczegóły + eventy poda
```

### Usunięcie klastra

```bash
kind delete cluster
```

### Struktura manifestów

- [`kind-cluster.yaml`](kind-cluster.yaml) — konfiguracja klastra kind
- [`k8s/db.yaml`](k8s/db.yaml) — ConfigMap, PersistentVolume, PersistentVolumeClaim, Pod i Service bazy danych
- [`k8s/backend.yaml`](k8s/backend.yaml) — Pod i Service backendu (NodePort 30001)
- [`k8s/frontend.yaml`](k8s/frontend.yaml) — Pod i Service frontendu (NodePort 30000)
