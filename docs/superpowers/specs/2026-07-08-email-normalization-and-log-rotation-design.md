# Email Normalization and Log Rotation Design

## Overview
This document outlines the design for two separate enhancements to the application:
1. Normalizing user email addresses to prevent duplicate submissions from the same user utilizing aliases or differing case.
2. Enabling log rotation for the Docker containers to prevent unbounded log growth.

## Architecture & Implementation

### 1. Email Normalization
The goal is to ensure that identical emails submitted in different formats (e.g., `User@example.com`, `user@example.com `, `user+alias@gmail.com`) resolve to the same canonical representation in our database.

**Dependency:**
*   Install `validator` npm package into the `vercel/package.json` backend environment.

**Code Changes (`vercel/server.js`):**
*   Import the `validator` library.
*   Update the endpoints that extract `email` from `req.body` or `req.query`:
    *   `GET /api/stats`
    *   `POST /api/opt-in`
    *   `POST /api/submit`
    *   `POST /api/join`
*   Pass the extracted email through `validator.normalizeEmail(email)`.
    *   *Note:* If the endpoint allows the email to be optional (e.g., `api/stats` or `api/submit`), we only normalize if an email was actually provided.
    *   *Behavior:* By default, `validator.normalizeEmail` removes trailing/leading spaces, lowercases the string, removes subaddress tags (`+alias`), and removes ignored dots for Gmail (and applies similar standard rules for Yahoo, Outlook, and iCloud).

### 2. Docker Log Rotation
The goal is to prevent the `scraper` container logs from consuming excessive disk space.

**Code Changes (`homelab/docker-compose.yml`):**
*   Add a `logging` block to the `scraper` service.
*   **Driver:** `json-file`
*   **Options:** 
    *   `max-size`: `"10m"` (limit each log file to 10 megabytes)
    *   `max-file`: `"3"` (retain a maximum of 3 log files)
