# Pledged Title Deed Investment Platform

A full-stack real estate investment platform for pledged title deed workflows. The application supports property owners, investors, local representatives, and administrators through property listing, investment offer, contract, payment, title deed, rental payment, and completion flows.

## Overview

This repository contains:

- A React + Vite client application in `client/`
- An Express + MongoDB API in `server/`
- Docker Compose infrastructure for MongoDB and MinIO
- QA seed tooling for repeatable local testing
- Postman and dummy document assets under `misc/`

The local QA setup is the recommended way to run the project while developing or testing lifecycle flows.

## Tech Stack

- Frontend: React, Vite, Redux Toolkit, React Router, Tailwind CSS, i18next
- Backend: Node.js, Express, Mongoose, JWT auth, Socket.IO
- Storage: MinIO for uploaded files in local and QA environments
- Database: MongoDB
- Testing: Jest for backend unit tests, Playwright for frontend smoke and critical e2e tests

## Repository Structure

```text
.
|-- client/                  # React/Vite frontend
|-- server/                  # Express API, models, services, routes, tests, seed data
|-- scripts/                 # Local QA environment helpers
|-- misc/                    # Postman collection and dummy upload files
|-- docker-compose.yml       # MongoDB and MinIO base services
|-- docker-compose.qa.yml    # QA health checks and MinIO bucket init
`-- README.md
```

## Prerequisites

- Node.js
- npm
- Docker and Docker Compose
- `mongosh` is useful for manual database inspection, but the QA script runs the required checks through Docker

## Quick Start

Start the QA infrastructure and seed the standard dataset:

```bash
./scripts/qa-env.sh
```

Install dependencies if they are not already installed:

```bash
cd server
npm install

cd ../client
npm install
```

Start the backend API:

```bash
cd server
npm run start:qa
```

Start the frontend:

```bash
cd client
npm run dev -- --host 127.0.0.1
```

Open the app at:

```text
http://localhost:5173
```

Use `localhost` for browser testing. The QA CORS configuration allows `http://localhost:5173`.

## QA Environment

The QA helper script starts MongoDB and MinIO, prepares the `uploads` bucket, and runs the QA seed.

```bash
./scripts/qa-env.sh up
./scripts/qa-env.sh reset
./scripts/qa-env.sh status
./scripts/qa-env.sh logs
./scripts/qa-env.sh down
```

Default QA services:

```text
API:           http://localhost:5001/api/v1
Frontend:      http://localhost:5173
MongoDB:       mongodb://localhost:27021/pledged_platform
MinIO API:     http://localhost:9000
MinIO Console: http://localhost:9001
```

The QA environment file is:

```text
server/config/env/qa.env.sample
```

## Development Commands

Backend:

```bash
cd server
npm run start:qa
npm run dev:qa
npm test
npm run seed:qa
npm run qa:reset
```

Frontend:

```bash
cd client
npm run dev
npm run build
npm run lint
npm run test:e2e:smoke
npm run test:e2e:critical
```

## Core Workflows

The platform is organized around four primary roles:

- Property owner: creates and manages properties, reviews offers, uploads owner-side documents, confirms payments, and tracks rental payments.
- Investor: browses published properties, submits offers, uploads investor-side documents, prepares principal payment, and reviews title deed documents.
- Local representative: claims eligible representative requests, reviews title deed stage documents, and follows assigned local execution cases.
- Admin: reviews and publishes properties, oversees investments, approves administrative actions, and completes property transfer flows.

High-level investment lifecycle:

1. Property owner creates a property.
2. Admin publishes the property.
3. Investor sends an investment offer.
4. Property owner accepts the offer.
5. Investor and owner upload signed contract documents.
6. Required counterparties approve contract documents.
7. Investor prepares principal payment and uploads a payment receipt.
8. Property owner approves or confirms the principal payment.
9. Property owner uploads title deed documentation.
10. Investor and, when assigned, local representative approve title deed documentation.
11. Investment becomes active and rental payment schedule is generated.
12. Admin completes property transfer when the lifecycle is ready to close.

## File Upload Test Assets

Dummy files for local and QA flows are available in:

```text
misc/Dummy Files/
```

Useful examples include:

- `InvestmentContract_Dummy.pdf`
- `PaymentReceipt_Dummy.pdf`
- `TitleDeed_Dummy.pdf`
- `RentalReceipt_Dummy.pdf`
- `TransferDocument_Dummy.pdf`

## API Collection

The Postman collection is located at:

```text
misc/Pledged Platform.postman_collection.json
```

Use the QA base URL when testing locally:

```text
http://localhost:5001/api/v1
```

## Testing Notes

Recommended backend test command:

```bash
cd server
npm test
```

Recommended frontend smoke test command:

```bash
cd client
npm run test:e2e:smoke
```

For rendered UI validation, run the QA backend and frontend together and test through `http://localhost:5173`.

## Troubleshooting

If uploads fail locally, confirm that MinIO is running and that the `uploads` bucket exists:

```bash
./scripts/qa-env.sh status
./scripts/qa-env.sh logs
```

If the frontend cannot call the API, confirm that:

- The backend is running on port `5001`
- The frontend is opened through `http://localhost:5173`
- `server/config/env/qa.env.sample` includes the expected `ALLOWED_ORIGINS`

If QA data looks stale, reseed it:

```bash
./scripts/qa-env.sh reset
```
