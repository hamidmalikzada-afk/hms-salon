# Contributing to HMS Salon

Thank you for your interest in contributing to HMS Salon! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/hms-salon.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Docker & Docker Compose (optional, for containerized development)

### Local Setup

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your database credentials
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### With Docker
```bash
docker compose up --build
```

## Code Style

We use ESLint and Prettier for code formatting. Before committing:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Commit Guidelines

- Use meaningful commit messages
- Start with a verb: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Example: `feat: add user authentication module`

## Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## Pull Request Process

1. Ensure your code passes linting and tests
2. Update documentation if needed
3. Provide a clear description of your changes
4. Reference any related issues: `Closes #123`
5. Request review from maintainers

## Reporting Issues

When reporting issues, please include:
- A clear, descriptive title
- Detailed description of the issue
- Steps to reproduce (if applicable)
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

## Questions?

Feel free to open an issue with the label `question` if you need help.

Thank you for contributing! 🎉
