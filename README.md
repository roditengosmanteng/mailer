# MailVerify Pro - Email Marketing Platform

A SaaS web application for bulk email import, validation, AI-powered verification, and email scraping. Built specifically for validating government, GLC, university, and private company emails (with focus on Malaysian organizations).

## Features

### 1. Bulk Email Import
- Upload CSV files or paste email addresses directly
- Automatic syntax validation on import
- Batch management for organizing imports
- Duplicate detection

### 2. Email Validation
- **Syntax Check**: RFC-compliant email format validation
- **MX Record Validation**: Verifies the domain has valid mail exchange records
- **SMTP Verification**: Connects to mail servers to verify deliverability

### 3. AI-Powered Internet Verification
- Integrates with multiple AI providers (OpenAI, Google Gemini, Anthropic, custom)
- Searches the internet to verify email owners exist at their organization
- For government emails like `mistera@moh.gov.my`, searches "mistera moh" to find the person
- Extracts name from local part (before @) and org code from domain
- Returns confidence score and source references

### 4. CSV Export
- Export verified emails filtered by status, batch, and AI confidence score
- Ready for upload to email campaign platforms

### 5. AI Email Scraping
- Enter a target organization (e.g., "Ministry of Tourism Malaysia")
- AI discovers email addresses from official websites and public sources
- Found emails are automatically imported and available for validation

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **AI**: Multi-provider support (OpenAI, Google Gemini, Anthropic, custom OpenAI-compatible)

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Environment Variables

Create a `.env` file:

```
DATABASE_URL="file:./dev.db"
```

AI provider API keys are configured through the Settings page in the UI.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List emails with pagination and filters |
| DELETE | `/api/emails` | Delete emails by IDs |
| POST | `/api/emails/import` | Import emails from CSV or text |
| POST | `/api/emails/validate` | Run MX/SMTP validation |
| POST | `/api/emails/ai-validate` | Run AI internet verification |
| GET | `/api/emails/export` | Export emails as CSV |
| GET/POST | `/api/scrape` | AI email scraping |
| GET/POST/PUT/DELETE | `/api/ai-providers` | Manage AI providers |
| GET/DELETE | `/api/batches` | Manage import batches |
