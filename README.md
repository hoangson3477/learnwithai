# Learning with AI Platform

A modern web platform where users learn through interactive AI-powered sessions, with quizzes, document library, and progress tracking.

## Features

- 🤖 **AI Chat Learning** - Learn from various topics with AI tutors
- 📝 **Quiz System** - Multiple choice quizzes with detailed explanations
- 📚 **Document Library** - Curated learning materials
- 📊 **Progress Dashboard** - Track learning statistics
- 👥 **User Authentication** - Secure sign up and login
- 🎓 **Multi-subject Support** - Various educational topics

## Tech Stack

- **Frontend**: Next.js 14, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Real-time**: Supabase Realtime

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (free tier available at supabase.com)
- Google Gemini API key (free tier available at ai.google.dev)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run all queries in `src/lib/db/migrations.sql`
   - Copy your `Project URL` and `Anon Key` from Settings → API

3. **Get Google Gemini API Key**:
   - Visit [ai.google.dev](https://ai.google.dev)
   - Create a new API key
   - Enable Gemini API for your project

4. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key-here
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # AI chat endpoints
│   │   ├── quiz/         # Quiz endpoints
│   │   └── documents/    # Document endpoints
│   ├── dashboard/        # Dashboard page
│   ├── chat/             # Chat page
│   ├── quiz/             # Quiz page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/
│   ├── db/
│   │   ├── supabase.ts   # Supabase client
│   │   └── migrations.sql # Database schema
│   └── gemini.ts         # Google Gemini AI client
└── types/                # TypeScript types

```

## API Documentation

### Chat
- `POST /api/chat` - Send message to AI tutor
  - Uses Google Gemini API (free tier: 60 requests/minute)
  - Response includes AI-generated educational content

### Quiz
- `GET /api/quiz` - Get all quizzes by topic/difficulty
  - Query: `?topic=string&difficulty=easy|medium|hard`
  - Returns quiz list with questions

### Documents
- `GET /api/documents` - Fetch documents with search
  - Query: `?topic=string&search=string`
  - Returns document list with author info

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |
| `NEXT_PUBLIC_API_URL` | Public API URL | No |

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Running Production Server
```bash
npm start
```

## Troubleshooting

### Port Already in Use
The dev server auto-selects an available port. Check terminal output for the correct URL.

### Supabase Connection Error
- Ensure you have created a Supabase project
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check RLS (Row Level Security) policies if data not loading

### Gemini API Error
- Verify API key is valid and active
- Check rate limits (free tier: 60 req/min)
- Ensure Gemini API is enabled in Google Cloud Console

## Next Steps

1. **Set Up Database**:
   - Create Supabase account and project
   - Run migrations to create tables
   - Configure RLS policies

2. **Implement Authentication**:
   - Add Supabase Auth integration
   - Create signup/login pages
   - Add user session management

3. **Seed Sample Data**:
   - Create sample quizzes in Supabase
   - Add learning materials and documents
   - Initialize user profiles

4. **Enhance UI**:
   - Add loading states and error handling
   - Implement animations and transitions
   - Optimize responsive design

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google Generative AI](https://ai.google.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

MIT License

## Support

For support, please open an issue on GitHub or contact us.
