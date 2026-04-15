/* 
  Supabase SQL Migrations
  
  Run these queries in Supabase SQL Editor to set up the database schema
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  bio TEXT DEFAULT '',
  learning_topics TEXT[] DEFAULT '{}',
  learning_goal TEXT,
  setup_completed BOOLEAN DEFAULT false,
  total_points INT DEFAULT 0,
  current_level INT DEFAULT 1,
  streak_count INT DEFAULT 0,
  last_lesson_date DATE,
  total_quizzes_taken INT DEFAULT 0,
  total_chat_sessions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lessons table (Duolingo-style lessons)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  topic TEXT NOT NULL,
  level INT DEFAULT 1,
  order_index INT NOT NULL,
  lesson_type VARCHAR(20) DEFAULT 'conversation',
  content JSONB NOT NULL,
  points_reward INT DEFAULT 10,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User lesson progress table
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  points_earned INT DEFAULT 0,
  completion_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  author UUID REFERENCES users(id) ON DELETE CASCADE,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score INT NOT NULL,
  points_earned INT DEFAULT 0,
  answers JSONB DEFAULT '[]',
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Generic personalization schema for multi-subject roadmap
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, code)
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty_band VARCHAR(20) DEFAULT 'beginner',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, code)
);

CREATE TABLE IF NOT EXISTS skill_prerequisites (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  prerequisite_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (skill_id, prerequisite_skill_id),
  CHECK (skill_id <> prerequisite_skill_id)
);

CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  target_level VARCHAR(20) DEFAULT 'beginner',
  weekly_minutes INT DEFAULT 120,
  preferred_content_types TEXT[] DEFAULT ARRAY['lesson', 'quiz'],
  goal TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS user_skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2) DEFAULT 0,
  confidence NUMERIC(5,2) DEFAULT 0,
  attempts INT DEFAULT 0,
  last_practiced_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS content_skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('lesson', 'quiz', 'document', 'chat_task')),
  content_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  weight NUMERIC(4,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id, skill_id)
);

CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('lesson_completed', 'quiz_submitted', 'chat_completed', 'document_viewed', 'recommendation_feedback')),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('lesson', 'quiz', 'document', 'chat_task')),
  content_id UUID,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('lesson', 'quiz', 'document')),
  content_id UUID NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason_json JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'skipped', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('accepted', 'skipped', 'completed')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alter existing tables to add lesson_id if it doesn't exist
ALTER TABLE IF EXISTS chat_history 
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS quizzes 
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

-- Alter users table to add gamification columns if missing
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lesson_date DATE;

-- Ensure legacy profile columns exist before personalization backfill
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS learning_topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_goal TEXT,
  ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic);
CREATE INDEX IF NOT EXISTS idx_lessons_level ON lessons(level);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_lesson_id ON chat_history(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topic);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_documents_topic ON documents(topic);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_skills_topic_id ON skills(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_mastery_user_id ON user_skill_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_mastery_skill_id ON user_skill_mastery(skill_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_subject ON learning_events(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_status ON recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

-- Forum tables
CREATE TABLE IF NOT EXISTS topic_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#22c55e',
  icon TEXT DEFAULT '📝',
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic_tag_id UUID REFERENCES topic_tags(id) ON DELETE SET NULL,
  likes_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Forum indexes
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_tag_id ON forum_posts(topic_tag_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_user_id ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON forum_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON forum_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_likes_user_id ON forum_comment_likes(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_skill_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for personalization schema
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view topics" ON topics;
CREATE POLICY "Anyone can view topics" ON topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view skills" ON skills;
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view skill prerequisites" ON skill_prerequisites;
CREATE POLICY "Anyone can view skill prerequisites" ON skill_prerequisites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view content skill map" ON content_skill_map;
CREATE POLICY "Anyone can view content skill map" ON content_skill_map FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own learning profiles" ON user_learning_profiles;
CREATE POLICY "Users can view own learning profiles" ON user_learning_profiles
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own learning profiles" ON user_learning_profiles;
CREATE POLICY "Users can manage own learning profiles" ON user_learning_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own mastery" ON user_skill_mastery;
CREATE POLICY "Users can view own mastery" ON user_skill_mastery
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own mastery" ON user_skill_mastery;
CREATE POLICY "Users can manage own mastery" ON user_skill_mastery
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own events" ON learning_events;
CREATE POLICY "Users can create own events" ON learning_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own events" ON learning_events;
CREATE POLICY "Users can view own events" ON learning_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own recommendations" ON recommendations;
CREATE POLICY "Users can manage own recommendations" ON recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own recommendation feedback" ON recommendation_feedback;
CREATE POLICY "Users can manage own recommendation feedback" ON recommendation_feedback
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for lessons
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT USING (true);

-- RLS Policies for user_lesson_progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_lesson_progress;
CREATE POLICY "Users can view own progress" ON user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create progress records" ON user_lesson_progress;
CREATE POLICY "Users can create progress records" ON user_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON user_lesson_progress;
CREATE POLICY "Users can update own progress" ON user_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chat_history
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create chat history" ON chat_history;
CREATE POLICY "Users can create chat history" ON chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quizzes
DROP POLICY IF EXISTS "Anyone can view quizzes" ON quizzes;
CREATE POLICY "Anyone can view quizzes" ON quizzes
  FOR SELECT USING (true);

-- RLS Policies for quiz_submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON quiz_submissions;
CREATE POLICY "Users can view own submissions" ON quiz_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create submissions" ON quiz_submissions;
CREATE POLICY "Users can create submissions" ON quiz_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for documents
DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
CREATE POLICY "Anyone can view documents" ON documents
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = author);

-- RLS Policies for topic_tags
DROP POLICY IF EXISTS "Anyone can view topic tags" ON topic_tags;
CREATE POLICY "Anyone can view topic tags" ON topic_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can manage topic tags" ON topic_tags;
CREATE POLICY "Only admin can manage topic tags" ON topic_tags
  FOR INSERT WITH CHECK (false);

-- RLS Policies for forum_posts
DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
CREATE POLICY "Anyone can view forum posts" ON forum_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create forum posts" ON forum_posts;
CREATE POLICY "Authenticated users can create forum posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
CREATE POLICY "Users can update own posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;
CREATE POLICY "Users can delete own posts" ON forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum_comments
DROP POLICY IF EXISTS "Anyone can view forum comments" ON forum_comments;
CREATE POLICY "Anyone can view forum comments" ON forum_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create forum comments" ON forum_comments;
CREATE POLICY "Authenticated users can create forum comments" ON forum_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON forum_comments;
CREATE POLICY "Users can update own comments" ON forum_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON forum_comments;
CREATE POLICY "Users can delete own comments" ON forum_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum_post_likes
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON forum_post_likes;
CREATE POLICY "Authenticated users can view post likes" ON forum_post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like posts" ON forum_post_likes;
CREATE POLICY "Authenticated users can like posts" ON forum_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their likes" ON forum_post_likes;
CREATE POLICY "Users can remove their likes" ON forum_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum_comment_likes
DROP POLICY IF EXISTS "Authenticated users can view comment likes" ON forum_comment_likes;
CREATE POLICY "Authenticated users can view comment likes" ON forum_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like comments" ON forum_comment_likes;
CREATE POLICY "Authenticated users can like comments" ON forum_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their comment likes" ON forum_comment_likes;
CREATE POLICY "Users can remove their comment likes" ON forum_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Seed default topic tags
INSERT INTO topic_tags (name, color, icon, description) VALUES
  ('💻 Lập Trình', '#3b82f6', '💻', 'Hỏi đáp về lập trình và phát triển web'),
  ('📐 Toán Học', '#f59e0b', '📐', 'Thảo luận về toán học và các bài toán'),
  ('🔬 Khoa Học', '#10b981', '🔬', 'Kiến thức khoa học tự nhiên'),
  ('🌍 Tiếng Anh', '#8b5cf6', '🌍', 'Trao đổi tiếng Anh và kỹ năng giao tiếp'),
  ('📚 Văn Học', '#ec4899', '📚', 'Phân tích và thảo luận văn học'),
  ('🎨 Nghệ Thuật', '#f97316', '🎨', 'Kiến thức về nghệ thuật và thiết kế'),
  ('📖 Lịch Sử', '#6366f1', '📖', 'Lịch sử và sự kiện lịch sử'),
  ('🌐 Địa Lý', '#06b6d4', '🌐', 'Địa lý thế giới và các vùng đất')
ON CONFLICT (name) DO NOTHING;

-- Seed subjects/topics/skills for generic roadmap bootstrapping
INSERT INTO subjects (code, name, description) VALUES
  ('english', 'Tiếng Anh', 'Ngôn ngữ và giao tiếp tiếng Anh'),
  ('programming', 'Lập trình', 'Kỹ năng lập trình và tư duy hệ thống'),
  ('math_science', 'Toán và Khoa học', 'Nền tảng định lượng và khoa học')
ON CONFLICT (code) DO NOTHING;

INSERT INTO topics (subject_id, code, name, description)
SELECT s.id, t.code, t.name, t.description
FROM (
  VALUES
    ('english', 'english_grammar', 'Ngữ pháp', 'Nắm chắc cấu trúc câu và thì'),
    ('english', 'english_vocabulary', 'Từ vựng', 'Mở rộng vốn từ trong ngữ cảnh'),
    ('programming', 'programming_js', 'JavaScript', 'Cú pháp và tư duy JavaScript hiện đại'),
    ('programming', 'programming_react', 'React', 'Thành thạo React và kiến trúc component'),
    ('math_science', 'math_algebra', 'Đại số', 'Nền tảng đại số và biến đổi biểu thức'),
    ('math_science', 'science_physics', 'Vật lý', 'Khái niệm cơ bản về lực và chuyển động')
) AS t(subject_code, code, name, description)
JOIN subjects s ON s.code = t.subject_code
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO skills (topic_id, code, name, description, difficulty_band)
SELECT t.id, sk.code, sk.name, sk.description, sk.difficulty_band
FROM (
  VALUES
    ('english_grammar', 'en_present_simple', 'Thì hiện tại đơn', 'Sử dụng đúng thì hiện tại đơn', 'beginner'),
    ('english_vocabulary', 'en_daily_vocab', 'Từ vựng hàng ngày', 'Từ vựng thông dụng trong hội thoại', 'beginner'),
    ('programming_js', 'js_variables', 'Biến và kiểu dữ liệu', 'Hiểu biến, kiểu dữ liệu và scope', 'beginner'),
    ('programming_react', 'react_hooks_basics', 'React Hooks cơ bản', 'Sử dụng useState và useEffect đúng cách', 'intermediate'),
    ('math_algebra', 'math_linear_equation', 'Phương trình bậc nhất', 'Giải phương trình một ẩn', 'beginner'),
    ('science_physics', 'physics_newton_laws', 'Định luật Newton', 'Hiểu và áp dụng 3 định luật Newton', 'intermediate')
) AS sk(topic_code, code, name, description, difficulty_band)
JOIN topics t ON t.code = sk.topic_code
ON CONFLICT (topic_id, code) DO NOTHING;

-- Backfill current users to personalization profile
INSERT INTO user_learning_profiles (user_id, subject_id, goal)
SELECT u.id, s.id, COALESCE(u.learning_goal, '')
FROM users u
JOIN subjects s ON (
  (s.code = 'english' AND ('english' = ANY(u.learning_topics) OR 'Tiếng Anh' = ANY(u.learning_topics))) OR
  (s.code = 'programming' AND ('programming' = ANY(u.learning_topics) OR 'Lập trình' = ANY(u.learning_topics))) OR
  (s.code = 'math_science' AND ('math' = ANY(u.learning_topics) OR 'science' = ANY(u.learning_topics) OR 'Toán học' = ANY(u.learning_topics) OR 'Khoa học' = ANY(u.learning_topics)))
)
ON CONFLICT (user_id, subject_id) DO NOTHING;

-- Seed sample lessons
INSERT INTO lessons (title, description, topic, level, order_index, lesson_type, content, points_reward, is_locked) 
VALUES
  (
    'Basics of JavaScript',
    'Learn the fundamentals of JavaScript programming language',
    'Lập Trình',
    1,
    1,
    'conversation',
    '{"introduction": "Let''s learn JavaScript basics", "key_points": ["Variables", "Data Types", "Functions", "Loops"], "examples": ["var x = 5;", "function greet() {return \"Hello\";}"]}'::jsonb,
    10,
    false
  ),
  (
    'React Hooks Explained',
    'Master React Hooks: useState, useEffect, useContext',
    'Lập Trình',
    2,
    2,
    'conversation',
    '{"introduction": "Understanding React Hooks", "key_points": ["useState Hook", "useEffect Hook", "Custom Hooks", "Rules of Hooks"], "examples": ["const [count, setCount] = useState(0);"]}'::jsonb,
    10,
    false
  ),
  (
    'Algebra Fundamentals',
    'Master algebraic equations and problem solving',
    'Toán Học',
    1,
    1,
    'conversation',
    '{"introduction": "Algebra is the language of mathematics", "key_points": ["Linear equations", "Quadratic equations", "Polynomials", "Factoring"], "examples": ["x + 5 = 12", "x² + 4x + 4 = 0"]}'::jsonb,
    10,
    false
  ),
  (
    'Physics: Motion and Forces',
    'Understanding motion, velocity, and Newton''s laws',
    'Khoa Học',
    2,
    1,
    'conversation',
    '{"introduction": "Physics explains the motion of objects", "key_points": ["Velocity and Speed", "Newton''s Three Laws", "Force and Acceleration", "Momentum"], "examples": ["F = ma", "v = d/t"]}'::jsonb,
    10,
    false
  ),
  (
    'English Grammar: Tenses',
    'Master English verb tenses and sentence structure',
    'Tiếng Anh',
    1,
    1,
    'conversation',
    '{"introduction": "Perfect your English grammar", "key_points": ["Present Tense", "Past Tense", "Future Tense", "Conditional Tense"], "examples": ["I am learning", "I was studying", "I will learn"]}'::jsonb,
    10,
    false
  ),
  (
    'Creative Writing Basics',
    'Develop your storytelling and creative writing skills',
    'Văn Học',
    1,
    1,
    'conversation',
    '{"introduction": "Unlock your creative potential", "key_points": ["Character Development", "Plot Structure", "Dialogue Writing", "Narrative Techniques"], "examples": ["Once upon a time...", "Show, don''t tell"]}'::jsonb,
    10,
    false
  ),
  (
    'World History: Renaissance',
    'Explore the Renaissance period and its impact on civilization',
    'Lịch Sử',
    2,
    1,
    'conversation',
    '{"introduction": "The Renaissance: A rebirth of knowledge", "key_points": ["Humanism", "Art and Culture", "Scientific Revolution", "Print Revolution"], "examples": ["Leonardo da Vinci", "Michelangelo''s David"]}'::jsonb,
    10,
    false
  )
ON CONFLICT DO NOTHING;

-- Seed sample quizzes
INSERT INTO quizzes (title, description, topic, questions, difficulty, created_by)
VALUES
  (
    'JavaScript Basics Quiz',
    'Test your knowledge of JavaScript fundamentals',
    'Lập Trình',
    '[
      {
        "id": 1,
        "question": "What is the correct way to declare a variable in JavaScript?",
        "options": ["var x = 5;", "variable x = 5;", "v x = 5;", "declare x = 5;"],
        "correct": 0
      },
      {
        "id": 2,
        "question": "Which method is used to find an element in an array?",
        "options": ["find()", "locate()", "search()", "query()"],
        "correct": 0
      },
      {
        "id": 3,
        "question": "What does typeof operator return for an array?",
        "options": ["array", "object", "list", "collection"],
        "correct": 1
      }
    ]'::jsonb,
    'easy',
    NULL
  ),
  (
    'React Intermediate Quiz',
    'Challenge yourself with React concepts',
    'Lập Trình',
    '[
      {
        "id": 1,
        "question": "What is the purpose of useEffect hook?",
        "options": ["To manage side effects", "To delete components", "To style components", "To fetch static files"],
        "correct": 0
      },
      {
        "id": 2,
        "question": "Which dependency array causes useEffect to run once?",
        "options": ["[undefined]", "[]", "[null]", "No dependency array"],
        "correct": 1
      },
      {
        "id": 3,
        "question": "What is the difference between useState and useReducer?",
        "options": ["useReducer handles complex state logic", "useState is faster", "useReducer is for hooks only", "No difference"],
        "correct": 0
      }
    ]'::jsonb,
    'medium',
    NULL
  ),
  (
    'Math Algebra Quiz',
    'Test your algebra problem-solving skills',
    'Toán Học',
    '[
      {
        "id": 1,
        "question": "Solve: x + 5 = 12. What is x?",
        "options": ["5", "7", "12", "17"],
        "correct": 1
      },
      {
        "id": 2,
        "question": "Factor: x² + 5x + 6",
        "options": ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "(x+2)(x-3)"],
        "correct": 0
      },
      {
        "id": 3,
        "question": "Simplify: 3x + 2x - x",
        "options": ["5x", "4x", "6x", "2x"],
        "correct": 1
      }
    ]'::jsonb,
    'easy',
    NULL
  )
ON CONFLICT DO NOTHING;

-- Seed sample documents
INSERT INTO documents (title, description, topic, content, author, tags)
VALUES
  (
    'JavaScript Best Practices Guide',
    'Essential best practices for writing clean and maintainable JavaScript code',
    'Lập Trình',
    'Chapter 1: Code Organization\n- Keep functions small and focused\n- Use meaningful variable names\n- Organize code into modules\n\nChapter 2: Performance\n- Avoid memory leaks\n- Optimize loops\n- Use const/let over var\n\nChapter 3: Testing\n- Write unit tests\n- Use testing frameworks\n- Test edge cases',
    NULL,
    ARRAY['javascript', 'best-practices', 'web-development']
  ),
  (
    'React Component Patterns',
    'Common patterns and best practices for React components',
    'Lập Trình',
    'Pattern 1: Compound Components\n- Create flexible, composable components\n- Use React.Children.map\n- Share state through context\n\nPattern 2: Render Props\n- Pass rendering logic as props\n- Highly flexible components\n- Example: <DataProvider render={(data) => ...} />\n\nPattern 3: Higher-Order Components\n- Reuse component logic\n- Enhance component functionality',
    NULL,
    ARRAY['react', 'patterns', 'javascript']
  ),
  (
    'English Vocabulary Builder',
    'Expand your English vocabulary with everyday words and phrases',
    'Tiếng Anh',
    'Unit 1: Business English\n- Meeting vocabulary: agenda, briefing, deadline\n- Email phrases: Best regards, Kind regards\n- Presentation language: To summarize, Moving forward\n\nUnit 2: Casual Conversation\n- Greetings: How''s it going? What''s up?\n- Small talk: Weather, weekend plans\n- Expressions: Pretty much, You know',
    NULL,
    ARRAY['english', 'vocabulary', 'communication']
  ),
  (
    'Physics Formula Sheet',
    'Quick reference guide for essential physics formulas',
    'Khoa Học',
    'Mechanics:\n- F = ma (Newton''s Second Law)\n- v = u + at (Kinematic equation)\n- E_k = 1/2 mv² (Kinetic Energy)\n- W = F × d (Work)\n\nThermodynamics:\n- Q = mcΔT (Heat capacity)\n- PV = nRT (Ideal Gas Law)\n\nElectromagnetism:\n- F = qE (Electric Force)\n- V = IR (Ohm''s Law)',
    NULL,
    ARRAY['physics', 'science', 'formulas']
  ),
  (
    'History: Key Dates and Events',
    'Important historical dates and events you should know',
    'Lịch Sử',
    'Medieval Period (1000-1500)\n- 1066: Norman Conquest of England\n- 1215: Magna Carta signed\n- 1347: Black Death begins\n\nRenaissance (1300-1600)\n- 1440: Printing press invented by Gutenberg\n- 1492: Columbus reaches Americas\n- 1543: Copernican Revolution begins\n\nModern Era (1600-present)\n- 1776: American Independence\n- 1789: French Revolution\n- 1945: End of World War II',
    NULL,
    ARRAY['history', 'timeline', 'events']
  )
ON CONFLICT DO NOTHING;

-- Seed sample forum posts
INSERT INTO forum_posts (user_id, title, content, topic_tag_id, likes_count, comment_count, view_count) 
VALUES
  (
    (SELECT id FROM users LIMIT 1),
    'Cách tối ưu hóa hiệu suất JavaScript trong ứng dụng web lớn',
    'Tôi đang làm việc trên một ứng dụng web quy mô lớn và nhận thấy hiệu suất bị giảm. Có ai có kinh nghiệm tối ưu hóa JavaScript không? Tôi đang sử dụng React và muốn biết thêm về tree-shaking, code splitting, và lazy loading. Xin cảm ơn!',
    (SELECT id FROM topic_tags WHERE name = '💻 Lập Trình' LIMIT 1),
    8, 12, 3
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Nên học TypeScript hay tiếp tục dùng JavaScript thuần?',
    'Mình là một lập trình viên junior, hiện tại đang làm việc với JavaScript thuần. Bây giờ công ty muốn chuyển sang TypeScript. Giá trị của TypeScript thực sự là gì? Có phải nó giúp tìm lỗi sớm hơn không? Hãy chia sẻ kinh nghiệm của bạn.',
    (SELECT id FROM topic_tags WHERE name = '💻 Lập Trình' LIMIT 1),
    5, 7, 2
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Cách dạy bé hiểu khái niệm hàm số lần đầu tiên',
    'Con tôi lớp 9 và đang học về hàm số nhưng không hiểu. Bạn nào có cách hay để giảng dạy khái niệm này không? Tôi đã thử dùng đồ thị nhưng con tôi vẫn còn bối rối. Giúp tôi với!',
    (SELECT id FROM topic_tags WHERE name = '📐 Toán Học' LIMIT 1),
    3, 9, 4
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Hiểu rõ hơn về định luật bảo toàn năng lượng',
    'Mình vừa học về định luật bảo toàn năng lượng nhưng không thực sự hiểu ý nghĩa của nó. Năng lượng không thể được tạo ra hay hủy diệt, chỉ chuyển hóa thành các dạng khác. Có ai có ví dụ cụ thể dễ hiểu không?',
    (SELECT id FROM topic_tags WHERE name = '🔬 Khoa Học' LIMIT 1),
    6, 4, 1
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Phát âm tiếng Anh chính xác - Mẹo và tài nguyên hay nhất',
    'Tôi đang cố gắng cải thiện phát âm tiếng Anh của mình. Hiện tại, tôi đang sử dụng Forvo và YouTube nhưng tiến độ chậm. Bạn có khuyến nghị nào về ứng dụng hoặc phương pháp tốt không? Cảm ơn bạn!',
    (SELECT id FROM topic_tags WHERE name = '🌍 Tiếng Anh' LIMIT 1),
    10, 6, 2
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Phân tích nhân vật chính trong "Những Người Khốn Khổ"',
    'Tôi đang viết bài luận về nhân vật Jean Valjean. Nhân vật này thay đổi như thế nào từ đầu đến cuối câu chuyện? Anh ta thực sự là người tốt hay chỉ là nạn nhân của hoàn cảnh? Các bạn có góc nhìn nào thú vị không?',
    (SELECT id FROM topic_tags WHERE name = '📚 Văn Học' LIMIT 1),
    9, 11, 5
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Tác động của Cách mạng Pháp đến các quốc gia khác',
    'Tôi đang học về Cách mạng Pháp và tò mò về cách nó ảnh hưởng đến phần còn lại của châu Âu. Nó gây ra những gì? Những quốc gia nào bị ảnh hưởng nhất? Ai có thể giải thích rõ hơn?',
    (SELECT id FROM topic_tags WHERE name = '📖 Lịch Sử' LIMIT 1),
    7, 14, 6
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Nguyên tắc của lý thuyết màu sắc trong thiết kế đồ họa',
    'Mình là một nhà thiết kế mới bắt đầu và muốn hiểu rõ hơn về lý thuyết màu sắc. Vòng tròn màu, bổ sung, tương phản - tất cả điều này có ý nghĩa gì? Có ai có ví dụ thực tế không?',
    (SELECT id FROM topic_tags WHERE name = '🎨 Nghệ Thuật' LIMIT 1),
    12, 5, 3
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Git workflow tốt nhất cho dự án nhóm',
    'Nhóm của chúng tôi gặp khó khăn khi làm việc với Git. Chúng tôi thường xuyên gặp conflicts và merge issues. Thiết lập Git workflow như thế nào để hiệu quả nhất cho toàn bộ nhóm?',
    (SELECT id FROM topic_tags WHERE name = '💻 Lập Trình' LIMIT 1),
    8, 9, 4
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Ứng dụng thực tế của đại số tuyến tính trong đời sống',
    'Tôi học đại số tuyến tính nhưng không thấy nó liên quan gì đến đời sống thực. Ma trận, vector, eigenvalues - chúng được sử dụng ở đâu? Ai có thể cho ví dụ cụ thể?',
    (SELECT id FROM topic_tags WHERE name = '📐 Toán Học' LIMIT 1),
    3, 8, 3
  ),
  (
    (SELECT id FROM users LIMIT 1),
    'Cách cải thiện kỹ năng viết luận bằng tiếng Anh',
    'Tôi muốn viết những bài luận tiếng Anh tốt hơn. Hiện tại, bài viết của tôi cảm thấy lặp lại hoặc không rõ ràng. Bạn có mẹo nào để cải thiện luận điểm và cấu trúc câu không?',
    (SELECT id FROM topic_tags WHERE name = '🌍 Tiếng Anh' LIMIT 1),
    10, 13, 7
  )
ON CONFLICT DO NOTHING;

-- Seed sample forum comments
DO $$
DECLARE
  user_id UUID;
  post_ids UUID[];
  comment_texts TEXT[] := ARRAY[
    'Tôi sử dụng Webpack với dynamic imports, nó chạy tốt lắm!',
    'Code splitting thực sự giúp giảm bundle size. Hãy thử nó!',
    'TypeScript an toàn hơn nhưng cần thêm setup. Có đáng không? Theo ý tôi là có.',
    'Tôi dạy bằng cách vẽ các điểm trên đồ thị rồi hỏi con tìm quy luật.',
    'Ví dụ tuyệt vời: Năng lượng điện trở thành nhiệt trong bóng đèn.',
    'Forvo thực sự tốt! Bạn cũng có thể xem phim tiếng Anh với phụ đề.',
    'Jean Valjean là một nhân vật động, anh ta thay đổi vì tình yêu và lòng trắc ẩn.',
    'Cách mạng Pháp lây lan các ý tưởng về tự do qua châu Âu, khiến các vua lo sợ!',
    'Màu bổ sung tạo sự cân bằng. Xem Matisse để thấy màu sắc như thế nào hài hòa.',
    'Git Flow là tốt nhất cho nhóm lớn. Hãy cân nhắc sử dụng nó!'
  ];
  i INT := 1;
BEGIN
  SELECT id INTO user_id FROM users LIMIT 1;
  SELECT array_agg(id ORDER BY created_at) INTO post_ids FROM forum_posts;
  
  IF post_ids IS NOT NULL THEN
    FOR i IN 1..array_length(post_ids, 1) LOOP
      IF i <= array_length(comment_texts, 1) THEN
        INSERT INTO forum_comments (post_id, user_id, content, likes_count)
        VALUES (post_ids[i], user_id, comment_texts[i], (i % 9) + 1)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- Role hierarchy + grade segmentation (except programming)
-- =====================================================

-- Add role and profile fields
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('web_admin', 'contributor', 'learner')),
  ADD COLUMN IF NOT EXISTS grade_level INT CHECK (grade_level BETWEEN 1 AND 12);

CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INT UNIQUE NOT NULL CHECK (grade BETWEEN 1 AND 12),
  label TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subject can be segmented by grade (programming is not segmented)
ALTER TABLE IF EXISTS subjects
  ADD COLUMN IF NOT EXISTS is_grade_segmented BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS subject_grade_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  UNIQUE(subject_id, grade_level_id)
);

ALTER TABLE IF EXISTS lessons
  ADD COLUMN IF NOT EXISTS grade_level_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS grade_level_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'theory' CHECK (document_type IN ('theory', 'exercise', 'reference'));

ALTER TABLE IF EXISTS forum_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'help' CHECK (post_type IN ('help', 'theory', 'discussion'));

CREATE INDEX IF NOT EXISTS idx_lessons_grade_level_id ON lessons(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_documents_grade_level_id ON documents(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_subject_grade_map_subject_id ON subject_grade_map(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_grade_map_grade_level_id ON subject_grade_map(grade_level_id);

ALTER TABLE subject_grade_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view grade levels" ON grade_levels;
CREATE POLICY "Anyone can view grade levels" ON grade_levels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view subject grade map" ON subject_grade_map;
CREATE POLICY "Anyone can view subject grade map" ON subject_grade_map
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can manage grade levels" ON grade_levels;
CREATE POLICY "Only admin can manage grade levels" ON grade_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin'
    )
  );

DROP POLICY IF EXISTS "Only admin can manage subject grade map" ON subject_grade_map;
CREATE POLICY "Only admin can manage subject grade map" ON subject_grade_map
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin'
    )
  );

-- Lessons permission:
-- web_admin can manage lessons, everyone can view
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
CREATE POLICY "Anyone can view lessons" ON lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can insert lessons" ON lessons;
CREATE POLICY "Only admin can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin')
  );

DROP POLICY IF EXISTS "Only admin can update lessons" ON lessons;
CREATE POLICY "Only admin can update lessons" ON lessons
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin')
  );

DROP POLICY IF EXISTS "Only admin can delete lessons" ON lessons;
CREATE POLICY "Only admin can delete lessons" ON lessons
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin')
  );

-- Documents permission:
-- web_admin: full control
-- contributor: can create/update own documents
-- learner: read-only
DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
CREATE POLICY "Anyone can view documents" ON documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create documents" ON documents;
DROP POLICY IF EXISTS "Admin and contributor can create documents" ON documents;
CREATE POLICY "Admin and contributor can create documents" ON documents
  FOR INSERT WITH CHECK (
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin')
    )
    OR
    (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'contributor')
      AND author = auth.uid()
      AND document_type = 'theory'
    )
  );

DROP POLICY IF EXISTS "Admin and contributor can update documents" ON documents;
CREATE POLICY "Admin and contributor can update documents" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role = 'web_admin'
        OR (u.role = 'contributor' AND documents.author = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Only admin can delete documents" ON documents;
CREATE POLICY "Only admin can delete documents" ON documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'web_admin')
  );

-- Forum permission:
-- web_admin: full
-- contributor: can post theory/discussion/help
-- learner: can post help only
DROP POLICY IF EXISTS "Authenticated users can create forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;

CREATE POLICY "Role based create forum posts" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role = 'web_admin'
        OR (u.role = 'contributor' AND post_type IN ('theory', 'discussion', 'help'))
        OR (u.role = 'learner' AND post_type = 'help')
      )
    )
  );

CREATE POLICY "Role based update own forum posts" ON forum_posts
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role = 'web_admin'
        OR (u.role = 'contributor')
        OR (u.role = 'learner' AND forum_posts.post_type = 'help')
      )
    )
  );

CREATE POLICY "Role based delete forum posts" ON forum_posts
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role = 'web_admin'
        OR u.role = 'contributor'
        OR (u.role = 'learner' AND forum_posts.post_type = 'help')
      )
    )
  );

-- Comments:
-- all authenticated roles can comment (help flow)
DROP POLICY IF EXISTS "Authenticated users can create forum comments" ON forum_comments;
CREATE POLICY "Authenticated users can create forum comments" ON forum_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('web_admin', 'contributor', 'learner')
    )
  );

-- Seed grade levels 1..12
INSERT INTO grade_levels (grade, label) VALUES
  (1, 'Lớp 1'), (2, 'Lớp 2'), (3, 'Lớp 3'), (4, 'Lớp 4'),
  (5, 'Lớp 5'), (6, 'Lớp 6'), (7, 'Lớp 7'), (8, 'Lớp 8'),
  (9, 'Lớp 9'), (10, 'Lớp 10'), (11, 'Lớp 11'), (12, 'Lớp 12')
ON CONFLICT (grade) DO NOTHING;

-- Programming is cross-grade
UPDATE subjects SET is_grade_segmented = false WHERE code = 'programming';

-- Map non-programming subjects to all grades by default
INSERT INTO subject_grade_map (subject_id, grade_level_id)
SELECT s.id, g.id
FROM subjects s
CROSS JOIN grade_levels g
WHERE s.code <> 'programming'
ON CONFLICT (subject_id, grade_level_id) DO NOTHING;

-- Seed test personalization snapshots for quick QA (safe no-op if prerequisites missing)
DO $$
DECLARE
  first_user UUID;
  programming_subject UUID;
  weak_skill UUID;
BEGIN
  SELECT id INTO first_user FROM users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO programming_subject FROM subjects WHERE code = 'programming' LIMIT 1;
  SELECT sk.id INTO weak_skill
  FROM skills sk
  JOIN topics tp ON tp.id = sk.topic_id
  JOIN subjects sb ON sb.id = tp.subject_id
  WHERE sb.code = 'programming'
  ORDER BY sk.created_at
  LIMIT 1;

  IF first_user IS NOT NULL AND programming_subject IS NOT NULL THEN
    INSERT INTO user_learning_profiles (user_id, subject_id, target_level, weekly_minutes, preferred_content_types, goal)
    VALUES (first_user, programming_subject, 'intermediate', 240, ARRAY['lesson', 'quiz', 'document'], 'Trở thành fullstack developer')
    ON CONFLICT (user_id, subject_id) DO UPDATE SET
      target_level = EXCLUDED.target_level,
      weekly_minutes = EXCLUDED.weekly_minutes,
      preferred_content_types = EXCLUDED.preferred_content_types,
      goal = EXCLUDED.goal,
      updated_at = NOW();
  END IF;

  IF first_user IS NOT NULL AND weak_skill IS NOT NULL THEN
    INSERT INTO user_skill_mastery (user_id, skill_id, mastery_score, confidence, attempts, last_practiced_at, updated_at)
    VALUES (first_user, weak_skill, 28, 35, 4, NOW() - INTERVAL '7 days', NOW())
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      mastery_score = EXCLUDED.mastery_score,
      confidence = EXCLUDED.confidence,
      attempts = EXCLUDED.attempts,
      last_practiced_at = EXCLUDED.last_practiced_at,
      updated_at = EXCLUDED.updated_at;

    INSERT INTO recommendations (user_id, subject_id, skill_id, content_type, content_id, score, reason_json, status)
    VALUES (
      first_user,
      programming_subject,
      weak_skill,
      'lesson',
      weak_skill,
      87,
      '{"seed":"qa", "reason":"low mastery skill"}'::jsonb,
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
