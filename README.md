# Projekt chmurowe — Spotify (PostgreSQL + Express + React)

Monorepo na potrzeby zajęć: baza **PostgreSQL**, backend **Express** (REST), frontend **Vite + React + Tailwind**.

## Wymagania

- [Docker](https://www.docker.com/) (PostgreSQL w kontenerze) **albo** środowisko z sekcji [Wirtualizacja (Vagrant)](#wirtualizacja-vagrant)
- Node.js 20+ i npm (lokalnie; w VM instaluje Ansible)

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
- [`Vagrantfile`](Vagrantfile) — trzy VM: `db`, `backend`, `frontend` (sieć prywatna + forward tylko Vite)
- [`ansible/playbooks/`](ansible/playbooks/) — provisioning wyłącznie Ansible (bez `shell` provisionera Vagranta)

## Produkcja

```bash
cd frontend && npm run build
```

Statyczne pliki w `frontend/dist/` — do hostowania za reverse proxy lub CDN; backend uruchamiaj przez `npm start` w `backend/` z ustawionym `DATABASE_URL`.

## Wirtualizacja (Vagrant)

Etap 5.0: trzy maszyny **`db`**, **`backend`**, **`frontend`** w sieci prywatnej VirtualBox (`192.168.56.0/24`). **Tylko `frontend`** ma `forwarded_port` (Vite `5173 → 127.0.0.1:5173` na hoście). PostgreSQL i API są dostępne wyłącznie z sieci prywatnej; przeglądarka na hoście łączy się z API pod adresem **`http://192.168.56.11:3000`** (routing VirtualBox do gościa).

### Wymagania na hoście

- [VirtualBox](https://www.virtualbox.org/)
- [Vagrant](https://www.vagrantup.com/)
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) na maszynie, z której uruchamiasz `vagrant` (Linux/macOS lub [WSL](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#installing-ansible-on-windows) na Windows — provisioner `ansible` uruchamia playbook na hoście i łączy się po SSH z gośćmi)

### Uruchomienie

Z katalogu głównego repozytorium (katalog montowany w gościach jako `/vagrant`):

```bash
vagrant up
```

Kolejność definicji VM: `db` → `backend` → `frontend`. Po starcie:

- UI: [http://localhost:5173](http://localhost:5173) (jedyny forward portu)
- API (z hosta): `http://192.168.56.11:3000` (np. `curl http://192.168.56.11:3000/songs`)

SSH:

```bash
vagrant ssh db
vagrant ssh backend
vagrant ssh frontend
```

Ponowne zastosowanie Ansible:

```bash
vagrant provision
# lub pojedynczo:
vagrant provision db
```

### Co robi Ansible

| Maszyna   | Playbook | Zawartość |
|-----------|----------|-----------|
| `db`      | [`ansible/playbooks/db.yml`](ansible/playbooks/db.yml) | PostgreSQL, `listen_addresses`, `pg_hba` dla podsieci, użytkownik i baza |
| `backend` | [`ansible/playbooks/backend.yml`](ansible/playbooks/backend.yml) | Node 20, `npm install`, `.env` z `DATABASE_URL` na IP bazy, `npm run import`, usługa systemd `chmurowe-backend` |
| `frontend`| [`ansible/playbooks/frontend.yml`](ansible/playbooks/frontend.yml) | Node 20, `.env` z `VITE_API_URL` na IP backendu, `npm install`, usługa systemd `chmurowe-frontend` (Vite `--host 0.0.0.0`) |

Szablony Jinja: [`ansible/templates/`](ansible/templates/). Adresy IP i hasła można zmienić w [`Vagrantfile`](Vagrantfile) (`ANSIBLE_VARS`).

### Windows bez Ansible na hoście

Domyślnie użyty jest provisioner `ansible` (playbook na hoście). Jeśli nie chcesz instalować Ansible w WSL, możesz w `Vagrantfile` zamienić `ansible` na `ansible_local` i dodać `ansible.install = true` — playbook wykona się na danej VM względem `localhost` (wymaga osobnej adaptacji playbooków pod `ansible_local`).

### Zatrzymanie / sprzątanie

```bash
vagrant halt
vagrant destroy
```
