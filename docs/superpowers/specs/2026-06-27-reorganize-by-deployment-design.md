# Folder Reorganization by Deployment Design Spec

## Purpose
This specification outlines the reorganization of the repository files into three distinct deployment directories: `vercel/`, `supabase/`, and `homelab/`. Decoupling these components optimizes Vercel serverless functions (by removing heavy Puppeteer browser automation packages from the bundle) and isolates background workers securely for dockerized homelab deployments.

## Directory Structure

```text
/ (Repository Root)
├── .gitignore
├── README.md
│
├── vercel/                   # Web application and serverless API endpoints
│   ├── vercel.json           # Vercel deployment routes config
│   ├── server.js             # Express API application code
│   ├── package.json          # Web dependencies only
│   ├── api/
│   │   └── index.js          # Serverless execution entry point
│   ├── public/               # Static frontend client files
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── tests/                # Web application unit tests
│       └── server.test.js
│
├── homelab/                  # Background worker polling daemon
│   ├── Dockerfile            # Secure non-root Puppeteer base configuration
│   ├── docker-compose.yml    # Worker container orchestration
│   ├── .dockerignore         # Docker build context exclusions
│   ├── run-scraper.js        # Polling worker daemon execution code
│   ├── scraper.js            # Core Puppeteer browser automation scripts
│   ├── utils.js              # Worker helpers
│   ├── package.json          # Scraper worker dependencies only
│   └── tests/                # Scraper unit tests
│       ├── run-scraper.test.js
│       └── scraper.test.js
│
└── supabase/                 # Supabase SQL schema definitions
    ├── schema.sql            # Base table structures
    ├── schema_update.sql     # Previous database schema updates
    └── schema_update_pool_data.sql # Latest pool_data column migration
```

## Dependencies & package.json Configuration

### 1. Web Application (`vercel/package.json`)
```json
{
  "name": "auto-report-web",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest tests/server.test.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^8.5.2",
    "helmet": "^8.2.0"
  },
  "devDependencies": {
    "jest": "^30.4.2",
    "supertest": "^7.2.2"
  }
}
```

### 2. Scraper Worker (`homelab/package.json`)
```json
{
  "name": "auto-report-worker",
  "version": "1.0.0",
  "private": true,
  "main": "run-scraper.js",
  "scripts": {
    "start": "node run-scraper.js",
    "test": "jest tests/"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "dotenv": "^17.4.2",
    "puppeteer": "^25.2.1",
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  },
  "devDependencies": {
    "jest": "^30.4.2"
  }
}
```

## Deployment Configuration Changes

1. **Vercel Project Configuration**:
   - The project's **Root Directory** in the Vercel Dashboard project settings must be configured to `vercel`. This tells Vercel to install dependencies from `vercel/package.json` and build/route files relative to the `vercel/` folder.
   - Routing defined in `vercel/vercel.json` maps incoming requests correctly within that environment.

2. **Homelab Docker Configuration**:
   - The `Dockerfile` inside `homelab/` will copy dependencies and files relative to its folder.
   - The build context in `docker-compose.yml` is updated to build from the local directory (`build: .`).
