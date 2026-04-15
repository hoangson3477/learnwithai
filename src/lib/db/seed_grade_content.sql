/*
  Seed structured content by grade (except programming).
  Run after migrations + reset_seed_data.sql.
*/

BEGIN;

-- Lessons by grade
INSERT INTO lessons (title, description, topic, level, order_index, lesson_type, content, points_reward, is_locked, grade_level_id)
SELECT
  'Toán lớp 6 - Tỉ số',
  'Hiểu khái niệm tỉ số và ứng dụng cơ bản',
  'Toán Học',
  1,
  1,
  'conversation',
  '{"introduction":"Tỉ số là cách so sánh hai đại lượng","key_points":["Định nghĩa tỉ số","Rút gọn tỉ số","Bài toán thực tế"]}'::jsonb,
  10,
  false,
  g.id
FROM grade_levels g
WHERE g.grade = 6
ON CONFLICT DO NOTHING;

INSERT INTO lessons (title, description, topic, level, order_index, lesson_type, content, points_reward, is_locked, grade_level_id)
SELECT
  'Vật lý lớp 8 - Chuyển động',
  'Phân biệt chuyển động đều và không đều',
  'Khoa Học',
  1,
  1,
  'conversation',
  '{"introduction":"Chuyển động trong đời sống","key_points":["Vận tốc","Quãng đường","Thời gian"]}'::jsonb,
  10,
  false,
  g.id
FROM grade_levels g
WHERE g.grade = 8
ON CONFLICT DO NOTHING;

INSERT INTO lessons (title, description, topic, level, order_index, lesson_type, content, points_reward, is_locked, grade_level_id)
VALUES
(
  'Programming - JavaScript Variables',
  'Biến, kiểu dữ liệu và khai báo trong JavaScript',
  'Lập Trình',
  1,
  1,
  'conversation',
  '{"introduction":"Variables in JS","key_points":["let/const","primitive types","naming conventions"]}'::jsonb,
  10,
  false,
  NULL
)
ON CONFLICT DO NOTHING;

-- Quizzes linked with lessons
INSERT INTO quizzes (lesson_id, title, description, topic, questions, difficulty, created_by)
SELECT
  l.id,
  'Quiz - ' || l.title,
  'Bài kiểm tra nhanh cho ' || l.title,
  l.topic,
  '[
    {"id":1,"question":"Khái niệm chính của bài là gì?","options":["A","B","C","D"],"correct":0},
    {"id":2,"question":"Ứng dụng thực tế nào phù hợp?","options":["A","B","C","D"],"correct":1}
  ]'::jsonb,
  'easy',
  NULL
FROM lessons l
WHERE l.title IN ('Toán lớp 6 - Tỉ số', 'Vật lý lớp 8 - Chuyển động', 'Programming - JavaScript Variables')
ON CONFLICT DO NOTHING;

-- Documents with role-oriented type
INSERT INTO documents (title, description, topic, content, author, tags, document_type, grade_level_id)
SELECT
  'Lý thuyết Toán lớp 6 - Tỉ số',
  'Tóm tắt lý thuyết tỉ số và ví dụ',
  'Toán Học',
  'Nội dung lý thuyết: ...',
  NULL,
  ARRAY['toan', 'lop6', 'ti-so'],
  'theory',
  g.id
FROM grade_levels g
WHERE g.grade = 6
ON CONFLICT DO NOTHING;

INSERT INTO documents (title, description, topic, content, author, tags, document_type, grade_level_id)
VALUES
(
  'JavaScript Variables Cheatsheet',
  'Tài liệu nhanh cho biến trong JavaScript',
  'Lập Trình',
  'let, const, scope, hoisting...',
  NULL,
  ARRAY['javascript', 'variables'],
  'reference',
  NULL
)
ON CONFLICT DO NOTHING;

COMMIT;
