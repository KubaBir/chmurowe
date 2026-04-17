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

## Docker Compose (stack produkcyjny, m.in. pod VM)

Z katalogu głównego repozytorium (kontekst buildu **musi** być root monorepo — obraz backendu kopiuje `db/` i `archive/`):

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm backend-service npm run import
```

- UI i API przez jeden port hosta: `http://localhost` (nginx w kontenerze `frontend` serwuje UI i proxy `/api` → backend).
- Przykład: `http://localhost/api/songs`

## Google Cloud (Etap 5 — VM, Terraform, Ansible, GKE)

Wymagania narzędziowe: [gcloud CLI](https://cloud.google.com/sdk/gcloud), [Terraform](https://www.terraform.io/), [Ansible](https://docs.ansible.com/), `kubectl`. W projekcie GCP włącz m.in. **Compute Engine**, **Kubernetes Engine**, **Artifact Registry** (dla obrazów GKE).

### 1. Terraform — maszyna wirtualna

```bash
cd infra/terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# Uzupełnij project_id, opcjonalnie zawęź ssh_cidr do swojego IP
terraform init
terraform apply
terraform output -raw instance_external_ip
```

Domyślnie `e2-micro` (zgodnie z materiałami o darmowym tierze) — przy braku pamięci (OOM) ustaw większy typ w `terraform.tfvars`. Firewall: **22** (SSH) i **80** (HTTP).

### 2. Ansible — Docker i aplikacja na VM

1. Jednorazowo połącz się SSH (konfiguruje klucze), np. `gcloud compute ssh chmurowe-app --zone=europe-west1-b` (dostosuj strefę do `terraform.tfvars`).
2. Skopiuj [`infra/ansible/inventory.ini.example`](infra/ansible/inventory.ini.example) do `infra/ansible/inventory.ini` i podstaw **IP** z `terraform output` oraz użytkownika / klucz (np. `ubuntu` i `~/.ssh/google_compute_engine`).
3. W [`infra/ansible/group_vars/all.yml`](infra/ansible/group_vars/all.yml) ustaw **URL swojego repozytorium** (`chmurowe_repo_url`), żeby VM mogła zrobić `git clone`.
4. Uruchom:

```bash
cd infra/ansible
ansible-playbook site.yml
```

Weryfikacja: w przeglądarce `http://INSTANCE_IP/` (UI) oraz `http://INSTANCE_IP/api/songs`.

### 3. GKE — obrazy i manifesty

1. Utwórz repozytorium w Artifact Registry (np. `chmurowe`) i [skonfiguruj Docker](https://cloud.google.com/artifact-registry/docs/docker/authentication):

   ```bash
   gcloud auth configure-docker REGION-docker.pkg.dev
   ```

2. Zbuduj i wypchnij obrazy (**kontekst = root repozytorium**):

   ```bash
   export REGION=europe-west1
   export PROJECT_ID=$(gcloud config get-value project)
   docker build -f backend/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/chmurowe/backend:latest .
   docker build -f frontend/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/chmurowe/frontend:latest .
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/chmurowe/backend:latest
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/chmurowe/frontend:latest
   ```

3. Utwórz klaster GKE (konsola lub `gcloud container clusters create ...`), potem:

   ```bash
   gcloud container clusters get-credentials NAZWA_KLASTRA --region=REGION
   ```

4. Skopiuj [`k8s/gke/secrets.yaml.example`](k8s/gke/secrets.yaml.example) do `k8s/gke/secrets.yaml`, ustaw hasło i spójny `database-url`, potem `kubectl apply -f k8s/gke/secrets.yaml`.

5. W plikach [`k8s/gke/backend-deployment.yaml`](k8s/gke/backend-deployment.yaml), [`k8s/gke/frontend-deployment.yaml`](k8s/gke/frontend-deployment.yaml) i [`k8s/gke/import-job.yaml`](k8s/gke/import-job.yaml) zamień `europe-west1-docker.pkg.dev/PROJECT_ID/chmurowe/...` na swoje **REGION / PROJECT_ID / nazwę repozytorium**.

6. Zastosuj manifesty:

   ```bash
   kubectl apply -k k8s/gke/
   ```

7. Poczekaj na adres Ingress (`kubectl get ingress chmurowe-ingress` — kolumna `ADDRESS`). Otwórz `http://ADRES/` oraz sprawdź `http://ADRES/api/songs`.

8. Import danych uruchamia **Job** `chmurowe-import`. Status: `kubectl logs job/chmurowe-import`. Ponowny import: `kubectl delete job chmurowe-import` i ponownie `kubectl apply -f k8s/gke/import-job.yaml`.

**Koszty:** GKE i load balancer Ingress generują opłaty — po zajęciach usuń klaster i niepotrzebne zasoby; `terraform destroy` w `infra/terraform/gcp` usuwa VM.

## Kubernetes (kind)

Wymagania: [kind](https://kind.sigs.k8s.io/), [kubectl](https://kubernetes.io/docs/tasks/tools/), Docker.

### Uruchomienie

```bash
# 1. Utwórz lokalny klaster (mapuje porty 30000→8080 i 30001→3000)
kind create cluster --config=kind-cluster.yaml

# 2. Zbuduj obrazy (kontekst: katalog główny monorepo)
docker build -t spotify-backend -f backend/Dockerfile .
docker build -t spotify-frontend -f frontend/Dockerfile .
# Opcjonalnie pod starą konfigurację API na osobnym porcie hosta:
# docker build -t spotify-frontend -f frontend/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 .

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
- API przez nginx frontendu: `http://localhost:8080/api/...` (np. `/api/songs`)
- Bezpośrednio na backend (NodePort): `http://localhost:3000`

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
- [`k8s/gke/`](k8s/gke/) — wariant pod **GKE** (PVC bez `hostPath`, Ingress, Secret, Job importu)
