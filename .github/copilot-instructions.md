<!-- Learning with AI Platform - Project Instructions -->

# LearnWithAI Project

A modern full-stack learning platform powered by AI, featuring chat tutoring, quizzes, document library, and progress tracking.

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- Google Gemini API key (free tier)

### Setup Environment

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be initialized

3. **Run Database Migrations**:
   - Open Supabase SQL Editor
   - Copy content from `src/lib/db/migrations.sql`
   - Paste and run all queries

4. **Configure Supabase Keys**:
   - Go to Settings → API
   - Copy `Project URL` and `Anon Key`
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
     ```

5. **Get Google Gemini API Key**:
   - Visit [ai.google.dev](https://ai.google.dev)
   - Create new API key
   - Add to `.env.local`:
     ```
     GOOGLE_GEMINI_API_KEY=your-key
     ```

6. **Run development server**:
   ```bash
   npm run dev
   ```
   Server runs at: http://localhost:3000 (or available port)

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home landing page
│   ├── chat/                 # AI chat learning page
│   ├── quiz/                 # Quiz platform page
│   ├── dashboard/            # User dashboard
│   ├── api/
│   │   ├── chat/route.ts     # Gemini AI integration
│   │   ├── quiz/route.ts     # Quiz endpoints
│   │   └── documents/route.ts # Document endpoints
│   └── layout.tsx            # Root layout
├── components/               # Reusable React components
├── lib/
│   ├── db/
│   │   ├── supabase.ts       # Supabase client
│   │   └── migrations.sql    # Database schema
│   └── gemini.ts             # Gemini AI client
└── .env.local               # Environment variables

```

## Features Implemented

- ✅ Next.js 14 with TypeScript
- ✅ Tailwind CSS styling
- ✅ Supabase integration (PostgreSQL)
- ✅ Google Gemini API integration
- ✅ API routes for chat, quiz, documents
- ✅ Responsive UI components
- ✅ Chat interface with AI tutor
- ✅ Quiz system with multiple choice
- ✅ Document library with search
- ✅ Learning dashboard

## Features Pending

- [ ] User authentication (Supabase Auth)
- [ ] User profiles and settings
- [ ] Quiz submission and scoring
- [ ] Chat history persistence
- [ ] Progress tracking and analytics
- [ ] Document creation/editing
- [ ] Real-time collaboration

## API Documentation

### Chat API
- `POST /api/chat` - Send message to AI tutor (Gemini)
  - Body: `{ message: string, topic: string }`
  - Returns: `{ success: boolean, message: string }`
  - Free tier: 60 requests/minute

### Quiz API
- `GET /api/quiz` - Fetch quizzes
  - Query: `?topic=string&difficulty=easy|medium|hard`
  - Returns: `{ success: boolean, quizzes: Quiz[], count: number }`

### Documents API
- `GET /api/documents` - Fetch documents with search
  - Query: `?topic=string&search=string`
  - Returns: `{ success: boolean, documents: Document[], count: number }`

## Environment Variables Reference

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | string | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | string | Yes | Supabase anonymous key |
| GOOGLE_GEMINI_API_KEY | string | Yes | Google Gemini API key |
| NEXT_PUBLIC_API_URL | string | No | Public API endpoint URL |

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React functional component patterns
- Use Tailwind CSS for styling
- Create reusable components in `/src/components`

### Database Queries
- Use Supabase client from `src/lib/db/supabase.ts`
- Enable RLS (Row Level Security) for data protection
- Handle auth via Supabase Auth

### Adding New Features
1. Create database tables/migrations in Supabase
2. Add API routes in `/src/app/api`
3. Build UI components in `/src/components`
4. Connect pages in `/src/app`

### Testing
- Build: `npm run build`
- Lint: `npm run lint`
- Dev: `npm run dev`

## Troubleshooting

### Port Already in Use
The dev server auto-selects an available port. Check terminal output for the correct URL.

### Supabase Connection Error
- Ensure Supabase project is created
- Verify URL and keys in `.env.local`
- Check RLS policies if data not loading

### Gemini API Error
- Verify API key is valid
- Check rate limits (60 req/min)
- Ensure Gemini enabled in Google Cloud

## Next Steps

1. **Implement Authentication**:
   - Add Supabase Auth integration
   - Create signup/login pages
   - Add user session management

2. **Database Seeding**:
   - Create sample quizzes
   - Add learning materials
   - Initialize user data

3. **Enhance UI**:
   - Add loading states
   - Improve error handling
   - Add animations

4. **Advanced Features**:
   - Real-time notifications (Supabase Realtime)
   - Leaderboards
   - Certificates
   - Social learning

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google Generative AI](https://ai.google.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

## Support

For issues or questions, refer to:
- Supabase Docs: https://supabase.com/docs
- Google AI Studio: https://ai.google.dev
- Next.js Docs: https://nextjs.org/docs
