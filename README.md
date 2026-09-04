# ALGORA - AI-Powered Personal Tutor Platform

**Status:** Phase 1 - Web MVP Development (Week 1-2: Foundation)

## 🎯 Overview

ALGORA is an AI-powered personal tutor platform for Turkish students preparing for YKS (TYT, AYT) and LGS exams. The platform generates personalized questions using OpenAI's GPT-4o-mini and provides detailed analytics for student progress.

## 🏗️ Architecture

**Hybrid Approach:** Web-first with future native conversion capability
- **Phase 1 (Current):** Web MVP using Next.js 14
- **Phase 2 (Future):** React Native conversion if traction is proven

## 🛠️ Tech Stack

### Web MVP
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** OpenAI GPT-4o-mini
- **Validation:** Zod
- **Hosting:** Vercel

### Future Native App
- **Framework:** React Native + Expo
- **UI:** React Native Paper
- **Navigation:** Expo Router
- **API:** Same Next.js backend

## 📁 Project Structure

```
algora/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx             # Landing page
│   │   ├── layout.tsx           # Root layout
│   │   ├── auth/                # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── onboarding/          # Onboarding flow
│   │   ├── dashboard/           # Main dashboard
│   │   └── api/                 # API routes
│   │       ├── questions/generate/  # AI question generation
│   │       └── users/stats/        # User performance stats
│   ├── components/              # React components
│   │   └── ui/                  # Base UI components
│   ├── lib/                     # Utility libraries
│   │   ├── supabase.ts          # Supabase client
│   │   ├── openai.ts            # OpenAI client
│   │   ├── utils.ts             # Helper functions
│   │   └── validation.ts        # Zod schemas + validators
│   └── types/                   # TypeScript definitions
│       ├── user.ts
│       ├── question.ts
│       └── answer.ts
├── public/                      # Static assets
├── .env.local.example           # Environment variables template
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier)
- OpenAI API key

### Installation

1. **Clone the repository:**
   ```bash
   cd algora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the following SQL in the Supabase SQL Editor:

```sql
-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'LGS')),
  target_score INTEGER NOT NULL,
  subjects TEXT[] NOT NULL,
  study_hours_per_day INTEGER NOT NULL,
  exam_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questions Table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT', 'LGS')),
  question_text TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Answers Table
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- User Stats View
CREATE OR REPLACE VIEW user_stats AS
SELECT
  user_id,
  COUNT(*) as total_answered,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
  AVG(time_spent) as average_time
FROM answers
GROUP BY user_id;

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Users can view own answers" ON answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 📱 Features

### Implemented Features (Phase 1 - Week 1-2)

- ✅ Next.js 14 project with TypeScript and Tailwind CSS
- ✅ Responsive landing page with hero, features, and pricing sections
- ✅ User authentication (email + Google OAuth)
- ✅ Onboarding flow for exam type and subject selection
- ✅ Dashboard with user stats and progress tracking
- ✅ AI-powered question generation using OpenAI GPT-4o-mini
- ✅ User statistics API
- ✅ Turkish language interface
- ✅ Mobile-responsive design

### Planned Features (Phase 1 - Week 3-8)

- ⏳ Real-time question practice interface
- ⏳ Detailed explanations for each question
- ⏳ Performance analytics and weak area detection
- ⏳ Study schedule generation
- ⏳ Exam simulation mode
- ⏳ Dark mode support

## 🔐 API Routes

### POST /api/questions/generate
Generate AI-powered questions for exam preparation.

**Request:**
```json
{
  "subject": "Matematik",
  "topic": "Türev",
  "difficulty": "intermediate",
  "exam_type": "TYT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "Soru metni...",
    "choices": ["A", "B", "C", "D"],
    "correctAnswer": 2,
    "explanation": "Adım adım çözüm..."
  }
}
```

### GET /api/users/stats
Retrieve user performance statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_questions_answered": 150,
    "correct_answers": 120,
    "accuracy_rate": 80,
    "average_time_per_question": 45,
    "subject_breakdown": [...],
    "weekly_progress": [...]
  }
}
```

## 🎨 Design System

### Colors
- **Primary:** Purple (#7C3AED)
- **Secondary:** Gray (#6B7280)
- **Success:** Green (#10B981)
- **Warning:** Orange (#F59E0B)
- **Error:** Red (#EF4444)

### Typography
- **Headings:** Inter, sans-serif
- **Body:** Inter, sans-serif
- **Monospace:** JetBrains Mono

### Components
- Button (primary, secondary, outline, ghost, danger)
- Card (with header, body, footer)
- Input (with validation)
- Select (with custom styling)

## 📊 Cost Projection (First 12 Months)

### Web MVP Phase (Months 1-6)
| Item | Monthly | 6-Month Total |
|------|---------|---------------|
| Vercel Hosting | ₺0 | ₺0 |
| Supabase Free Tier | ₺0 | ₺0 |
| OpenAI API (1K users) | ~₺200 | ₺1,200 |
| Domain (optional) | ₺25 | ₺150 |
| **Total** | **~₺225** | **~₺1,350** |

### Native Conversion (Months 7-12, Optional)
| Item | One-Time |
|------|-----------|
| Play Store | ₹100 |
| iOS Developer Program | ₺2,000/year |

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🚢 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Environment Variables for Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## 📈 Success Metrics

### Web MVP Success Criteria (Month 3)
- 100+ registered users
- 50+ active weekly users
- 15+ questions solved per user/day
- 70%+ user retention (week 1 → week 2)

### Trigger for Native Conversion
- 500+ monthly active users
- 20+ paid subscriptions
- 40%+ users access via mobile
- Clear user demand for native app

## 🔄 Development Status

**Current Phase:** Phase 1 - Week 1-2 (Foundation)

**Completed:**
- ✅ Next.js 14 initialization
- ✅ TypeScript configuration
- ✅ Tailwind CSS setup
- ✅ Core dependencies installation
- ✅ Type definitions
- ✅ Supabase client setup
- ✅ OpenAI integration
- ✅ Base UI components
- ✅ Landing page
- ✅ Authentication pages
- ✅ Onboarding flow
- ✅ Dashboard page
- ✅ API routes (questions, stats)

**In Progress:**
- ⏳ Database setup and RLS policies
- ⏳ Environment configuration
- ⏳ Root layout and navigation

**Next Steps:**
1. Complete database setup in Supabase
2. Configure environment variables
3. Test authentication flow
4. Test AI question generation
5. Deploy to Vercel for beta testing

## 🤝 Contributing

This is a solo developer project. Contributions are not currently accepted.

## 📄 License

Proprietary - All rights reserved

## 👤 Developer

- **Project:** ALGORA
- **Phase:** Phase 1 - Web MVP
- **Timeline:** 8 weeks to working MVP
- **Resources:** Solo developer, ₺0 budget

## 📞 Support

For questions or support, contact the development team.

---

**Last Updated:** July 13, 2026
**Development Phase:** Week 1-2 (Foundation)
**Next Milestone:** Database Setup & Authentication Testing
