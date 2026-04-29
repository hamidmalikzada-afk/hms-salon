# HMS Salon

Hamid Malikzada Software salon management system prepared as a small application
with a basic DevOps pipeline for assignment use.

## Project Overview

HMS Salon is a web-based salon and barbershop management system for:

- branch management
- customer management
- token queue and appointments
- invoice/POS flow
- expenses and commissions
- reports and customer loyalty

This repository also demonstrates the key DevOps stages requested in the
assignment:

- application development
- Git-ready project structure
- Docker containerization
- CI workflow
- Terraform-based local infrastructure simulation

## Tech Stack

- Frontend: React + Vite + Axios + React Router
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT
- Containerization: Docker + Docker Compose
- CI: GitHub Actions
- IaC: Terraform with Docker provider

## Main Application Features

- JWT login and registration flow
- Role support for `super_admin`, `manager`, and `cashier`
- Multi-branch access control
- Branch management
- Services catalog
- Customer history, loyalty, and VIP status
- Walk-in token queue
- Appointment booking
- Invoice/POS flow with printable receipt page
- Expenses tracking
- Commission tracking
- Reports and business insights

## Repository Structure

- [frontend](/Users/hamid/Desktop/Hairsaloon/frontend)
- [backend](/Users/hamid/Desktop/Hairsaloon/backend)
- [database/schema.sql](/Users/hamid/Desktop/Hairsaloon/database/schema.sql)
- [docker-compose.yml](/Users/hamid/Desktop/Hairsaloon/docker-compose.yml)
- [terraform](/Users/hamid/Desktop/Hairsaloon/terraform)
- [.github/workflows/ci.yml](/Users/hamid/Desktop/Hairsaloon/.github/workflows/ci.yml)

## Run Locally Without Docker

1. Create a PostgreSQL database named `hairsaloon`.
2. Run the SQL in [database/schema.sql](/Users/hamid/Desktop/Hairsaloon/database/schema.sql).
3. Copy [backend/.env.example](/Users/hamid/Desktop/Hairsaloon/backend/.env.example) to `backend/.env`.
4. Copy [frontend/.env.example](/Users/hamid/Desktop/Hairsaloon/frontend/.env.example) to `frontend/.env` if needed.
5. Start the backend:

```bash
cd backend
npm install
npm run dev
```

6. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

7. Open:

- `http://localhost:5173`

## Run With Docker

This is the simplest assignment demo path.

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5050`
- PostgreSQL: `localhost:5432`

Notes:

- The PostgreSQL container automatically loads [database/schema.sql](/Users/hamid/Desktop/Hairsaloon/database/schema.sql) on first startup.
- The Docker setup uses:
  - database user: `postgres`
  - database password: `postgres`
  - database name: `hairsaloon`

## CI Workflow

The GitHub Actions workflow is in:

- [.github/workflows/ci.yml](/Users/hamid/Desktop/Hairsaloon/.github/workflows/ci.yml)

It performs:

- backend dependency install
- frontend dependency install
- backend syntax checks
- frontend lint
- frontend build
- backend Docker image build
- frontend Docker image build

You can also simulate the same checks locally with:

```bash
./scripts/devops-check.sh
```

## Terraform Simulation

The Terraform configuration is in:

- [terraform/main.tf](/Users/hamid/Desktop/Hairsaloon/terraform/main.tf)

It uses the Docker provider to simulate infrastructure locally by defining:

- a Docker network
- a PostgreSQL container
- a backend container
- a frontend container

Commands:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Suggested Demo Flow

For the assignment video, show:

1. Application running in browser
2. Git repository structure and commits
3. `docker compose up --build`
4. CI workflow file
5. `terraform init` and `terraform plan`
6. Basic application flow:
   - login
   - branches
   - customers
   - queue or appointments
   - invoice/report view

Detailed speaking/demo help:

- [ASSIGNMENT_DEMO.md](/Users/hamid/Desktop/Hairsaloon/ASSIGNMENT_DEMO.md)

## Suggested Report Sections

Use this structure for the 5–8 page report:

1. Introduction and project overview
2. Application architecture
3. Development tools and stack
4. Git and version control workflow
5. Docker containerization
6. CI/CD pipeline explanation
7. Terraform infrastructure simulation
8. Challenges and solutions
9. Conclusion

Editable template:

- [REPORT_TEMPLATE.md](/Users/hamid/Desktop/Hairsaloon/REPORT_TEMPLATE.md)

## Notes

- This project can be demonstrated fully on a local machine.
- The Docker and Terraform layers are intentionally simple to match assignment scope.
- The software itself is larger than the minimum requirement, but you can demo only the key modules.
