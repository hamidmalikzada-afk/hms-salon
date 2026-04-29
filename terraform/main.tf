terraform {
  required_version = ">= 1.5.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

locals {
  app_name = "hms-salon"
}

resource "docker_network" "hms_network" {
  name = "${local.app_name}-network"
}

resource "docker_volume" "postgres_data" {
  name = "${local.app_name}-postgres-data"
}

resource "docker_image" "postgres" {
  name = "postgres:16-alpine"
}

resource "docker_image" "backend" {
  name = "${local.app_name}-backend:latest"

  build {
    context = "${path.module}/../backend"
  }
}

resource "docker_image" "frontend" {
  name = "${local.app_name}-frontend:latest"

  build {
    context = "${path.module}/../frontend"

    build_arg = {
      VITE_API_URL = "http://localhost:5050/api"
    }
  }
}

resource "docker_container" "postgres" {
  name  = "${local.app_name}-postgres"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_DB=hairsaloon",
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=postgres",
  ]

  ports {
    internal = 5432
    external = 5432
  }

  networks_advanced {
    name = docker_network.hms_network.name
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  volumes {
    host_path      = "${path.module}/../database/schema.sql"
    container_path = "/docker-entrypoint-initdb.d/01-schema.sql"
    read_only      = true
  }
}

resource "docker_container" "backend" {
  name  = "${local.app_name}-backend"
  image = docker_image.backend.image_id

  env = [
    "PORT=5050",
    "NODE_ENV=development",
    "DB_USER=postgres",
    "DB_HOST=${docker_container.postgres.name}",
    "DB_NAME=hairsaloon",
    "DB_PASSWORD=postgres",
    "DB_PORT=5432",
    "JWT_SECRET=change_this_secret_to_a_long_random_value",
    "JWT_EXPIRES_IN=12h",
    "CORS_ORIGINS=http://localhost:5173",
    "TRUST_PROXY=false",
  ]

  ports {
    internal = 5050
    external = 5050
  }

  networks_advanced {
    name = docker_network.hms_network.name
  }

  depends_on = [docker_container.postgres]
}

resource "docker_container" "frontend" {
  name  = "${local.app_name}-frontend"
  image = docker_image.frontend.image_id

  ports {
    internal = 80
    external = 5173
  }

  networks_advanced {
    name = docker_network.hms_network.name
  }

  depends_on = [docker_container.backend]
}
