# Khatabook AI Hackathon

## Overview

This project is an AI-powered financial assistant designed for Indian MSMEs. It simplifies compliance and financial management by automating GSTR-3B report generation, providing real-time financial insights via an AI CFO, and digitizing paper receipts using OCR.

## Features

- **Automated GSTR-3B Reporting**: Generates compliant GSTR-3B PDF reports based on invoice data.
- **AI CFO Assistant**: A chat interface powered by FastRouter (Claude Sonnet) to answer financial queries based on real-time business data.
- **Receipt Digitization**: Upload and analyze invoice images to automatically extract details like GSTIN, Taxable Value, and Tax amounts.
- **Dashboard**: Visual overview of Total Outstanding, ITC at Risk, and Safe to Pay amounts.

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn UI
- **Backend/Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI SDK connecting to FastRouter (Claude Sonnet 3.5)
- **PDF Generation**: PDFKit

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase project
- A FastRouter API Key

## Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FASTROUTER_API_KEY=your_fastrouter_api_key
```

## Installation & Usage

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd khatabook-ai-hackathon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the application:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Product Demo

[Link to Product Demo / Video Presentation] (Add your link here)

## License

This project is created for the Khatabook AI Hackathon.
