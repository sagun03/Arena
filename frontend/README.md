# IdeaAudit Frontend

Next.js 16 frontend for the IdeaAudit platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables:

```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run the development server:

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── debate/[id]/         # Debate visualization
│   └── verdict/[id]/        # Verdict display
├── components/               # React components
├── lib/                      # Utilities and API client
└── public/                   # Static assets
```
