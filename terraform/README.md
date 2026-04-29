# Terraform Simulation

This folder shows a simple Infrastructure as Code example for the HMS Salon
assignment using the Docker provider.

## What It Creates

- A Docker network
- A PostgreSQL container
- A backend container
- A frontend container

## Commands

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Notes

- Docker Desktop (or another Docker daemon) must be running.
- This is a local infrastructure simulation, which is acceptable for the
  assignment brief.
