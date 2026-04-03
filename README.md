# Digital Asset Management & Media Intelligence Platform

A microservices-based backend platform for managing digital assets at scale with automated intelligence, usage tracking, and analytics capabilities.

## Project Overview

Organizations struggle with scattered digital assets across shared drives, cloud folders, and messaging tools. This platform provides a centralized solution that:

- **Manages assets** - Upload, store, version, and organize digital files
- **Automates intelligence** - Extract metadata, detect duplicates, validate compliance
- **Tracks usage** - Monitor how and where assets are used across teams
- **Generates insights** - Analytics dashboards for asset performance and trends
- **Processes async** - Heavy tasks run in background without blocking users

## Tech Stack

| Category          | Technology              | Purpose                                 |
| ----------------- | ----------------------- | --------------------------------------- |
| **Runtime**       | Node.js 18+             | JavaScript runtime                      |
| **Language**      | TypeScript              | Type safety and developer experience    |
| **Framework**     | Express.js              | REST API framework                      |
| **Database**      | PostgreSQL              | Primary relational database             |
| **Storage**       | MinIO                   | S3-compatible object storage for assets |
| **Cache**         | Redis                   | Caching and session management          |
| **Message Queue** | RabbitMQ                | Async job processing                    |
| **Container**     | Docker & Docker Compose | Service orchestration                   |
| **Testing**       | Jest                    | Unit and integration testing            |
| **Linting**       | ESLint + Prettier       | Code quality and formatting             |
| **Git Hooks**     | Husky + lint-staged     | Pre-commit quality checks               |

## Folder Structure

```
asset-management-backend/
│
├── auth/ # Authentication Service (Port: 3001)
│ ├── src/
│ │ ├── config/ # Configuration files
│ │ ├── controllers/ # Request handlers
│ │ ├── middleware/ # Auth middleware
│ │ ├── routes/ # API routes
│ │ ├── services/ # Business logic
│ │ ├── types/ # TypeScript interfaces
│ │ ├── utils/ # Helper functions
│ │ └── tests/ # Test files
│ ├── Dockerfile
│ ├── env.example
│ ├── package.json
│ └── tsconfig.json
│
├── asset/ # Asset Management Service (Port: 3002)
│ ├── src/
│ │ ├── config/
│ │ ├── constants/
│ │ ├── controllers/
│ │ ├── helpers/
│ │ ├── middleware/
│ │ ├── routes/
│ │ ├── services/
│ │ ├── types/
│ │ ├── utils/
│ │ └── tests/
│ ├── Dockerfile
│ ├── env.example
│ ├── package.json
│ └── tsconfig.json
│
├── metadata/ # Metadata Service (Port: 3003)
├── usage/ # Usage Tracking Service (Port: 3004)
├── analytics/ # Analytics Service (Port: 3005)
├── worker/ # Background Worker Service (Port: 3006)
├── gateway/ # API Gateway (Port: 3000)
│
├── docker-compose.yml # Multi-container orchestration
├── commitlint.config.js # Commit message convention
├── eslint.config.js # ESLint configuration
├── lint-staged.config.js # Pre-commit tasks
├── tsconfig.base.json # Shared TypeScript config
├── package.json # Root workspace configuration
└── README.md
```

## Setup & Installation

### Prerequisites

```
Node.js 18+
Docker & Docker Compose
npm 9+
```

### Step 1: Clone Repository

```
git clone https://github.com/SushantKumar29/asset-management-backend.git
cd asset-management-backend
```

### Step 3: Configure Environment Variables

Create .env.dev files for each service (examples provided):

```
auth/.env.dev
-------------
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/asset_management
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

asset/.env.dev
--------------
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/asset_management
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672

# Similar for other services...
```

### Step 4: Start Services

```
# Development mode (with hot reload)

# Build and start
npm run dev:build

# Or start if already built
npm run dev (This will run docker compose up)

# Stop all services
npm run dev:down
```

### Step 5: Verify Installation

```
# Check API Gateway health
curl http://localhost:3000/health

# Check individual services
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Asset
curl http://localhost:3003/health  # Metadata
curl http://localhost:3004/health  # Usage
curl http://localhost:3005/health  # Analytics

# View running containers
docker compose ps
```

## Scripts

```
# Development
npm run dev                 # Start all services with Docker Compose
npm run dev:build          # Build and start all services
npm run dev:down           # Stop all services

# Code Quality
npm run lint               # Run ESLint on all code
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting

# Testing
npm test                   # Run all service tests
npm run test:auth         # Test only auth service
npm run test:asset        # Test only asset service
npm run test:metadata     # Test only metadata service
npm run test:usage        # Test only usage service
npm run test:analytics    # Test only analytics service
```

## Contributing

1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'feat: add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

### Commit Convention

This project follows Conventional Commits:

- feat: New feature
- fix: Bug fix
- docs: Documentation
- conf: Configuration
- style: Code style (formatting, missing semicolons)
- refactor: Code refactoring
- test: Adding tests
- perf: Performance improvement
- revert: Revert a previous commit
- build: Build system or dependencies
- ci: CI configuration changes

## License

Copyright (c) 2026 Susanta Kumar.

Permission is hereby granted, free of charge, to any person obtaining a copy

## Authors

Susanta Kumar - Initial work

## Acknowledgments

Node.js community

Docker team

All contributors
