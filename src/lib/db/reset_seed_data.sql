/*
  Reset current lessons and test/sample data.
  Run in Supabase SQL Editor when you want a clean slate.

  WARNING:
  - This removes seeded learning/test content and related user progress.
  - Keep users/auth accounts intact.
*/

BEGIN;

-- Remove recommendation/test telemetry first
DELETE FROM recommendation_feedback;
DELETE FROM recommendations;
DELETE FROM learning_events;
DELETE FROM user_skill_mastery;
DELETE FROM user_learning_profiles;

-- Remove learning content interactions
DELETE FROM quiz_submissions;
DELETE FROM chat_history;
DELETE FROM user_lesson_progress;

-- Remove main content
DELETE FROM quizzes;
DELETE FROM documents;
DELETE FROM lessons;

-- Optional: clean forum sample data as well
DELETE FROM forum_comment_likes;
DELETE FROM forum_post_likes;
DELETE FROM forum_comments;
DELETE FROM forum_posts;

-- Optional: reset taxonomy/sample personalization (uncomment if needed)
-- DELETE FROM content_skill_map;
-- DELETE FROM skill_prerequisites;
-- DELETE FROM skills;
-- DELETE FROM topics;
-- DELETE FROM subject_grade_map;
-- DELETE FROM subjects;
-- DELETE FROM grade_levels;

COMMIT;

/*
  Role quick setup examples:
  UPDATE users SET role = 'web_admin' WHERE email = 'admin@example.com';
  UPDATE users SET role = 'contributor' WHERE email = 'teacher@example.com';
  UPDATE users SET role = 'learner' WHERE role IS NULL OR role = '';
*/
