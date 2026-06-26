# Auto Report Site - Root Context

**Purpose:**
This is the root directory of the "Auto Report Site" project. It contains the core configuration files, backend Express server (`server.js`), Puppeteer scraping logic (`scraper.js`, `run-scraper.js`), database schema (`schema.sql`), and dependency definitions (`package.json`).

**Key Files:**
- `server.js`: The Express API and backend application logic.
- `scraper.js`: Functions utilizing Puppeteer to automate website reporting interactions.
- `run-scraper.js`: A standalone script to run the scraper, typically via GitHub Actions.
- `schema.sql`: The database schema definition for Supabase (PostgreSQL).
- `README.md`: High-level setup and deployment documentation.

**How AI should use this folder:**
Understand the core application logic and dependencies here. Look here for database queries, scraping workflows, server API routes, and main configuration.
