# HMS Salon Assignment Demo

Use this file as your video checklist for the 10–15 minute recording.

## 1. Project Introduction

Say:

- Project name: `HMS Salon`
- Purpose: salon and barbershop management system
- Stack:
  - React + Vite frontend
  - Node.js + Express backend
  - PostgreSQL database
  - Docker
  - GitHub Actions CI
  - Terraform

## 2. Show Repository Structure

Show these folders/files:

- `frontend/`
- `backend/`
- `database/schema.sql`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `terraform/`
- `scripts/devops-check.sh`

## 3. Show Application Running

If using local mode:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Open:

- `http://localhost:5173`

Show:

- login
- dashboard
- branches
- customers
- queue or appointments
- reports

## 4. Show Docker

Commands:

```bash
docker compose up --build
```

Explain:

- PostgreSQL runs in one container
- backend runs in one container
- frontend runs in one container

Show:

- app opens on `http://localhost:5173`
- backend API is on `http://localhost:5050`

## 5. Show CI / Pipeline

Show:

- `.github/workflows/ci.yml`

Explain:

- install dependencies
- backend syntax checks
- frontend lint
- frontend build
- Docker image build

Optional local simulation:

```bash
./scripts/devops-check.sh
```

## 6. Show Terraform

Commands:

```bash
cd terraform
terraform init
terraform plan
```

Explain:

- Docker provider is used as local infrastructure simulation
- Terraform defines:
  - Docker network
  - PostgreSQL container
  - backend container
  - frontend container

## 7. Suggested Closing

Say:

- The project demonstrates application development, version control readiness,
  containerization, CI workflow, and Infrastructure as Code.
- It runs locally and can be extended to a cloud deployment later.
