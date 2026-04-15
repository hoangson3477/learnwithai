# Tóm tắt thay đổi: MongoDB → Supabase + OpenAI → Gemini

## 📦 Dependencies

### Gỡ bỏ
- `mongoose` (MongoDB driver)

### Thêm
- `@supabase/supabase-js` (Supabase client)
- `@google/generative-ai` (Google Gemini API)

## 📁 Thay đổi Cấu Trúc

### Thay thế:
```
src/lib/db/mongodb.ts  →  src/lib/db/supabase.ts (Supabase client)
src/lib/openai.ts      →  src/lib/gemini.ts (Gemini client)
src/models/*           →  Deprecated (dùng Supabase SQL)
```

### Thêm:
```
src/lib/db/migrations.sql  (Database schema - chạy trong Supabase)
SETUP_GUIDE.md             (Hướng dẫn cài đặt)
```

## 🔄 API Endpoints

### Chat API
- Thay: OpenAI API (`gpt-3.5-turbo`)
- Thành: Google Gemini API (`gemini-pro`)
- System instruction: Tiếng Việt, chuyên môn theo topic

### Quiz API & Documents API
- Thay: MongoDB queries (Mongoose)
- Thành: Supabase queries (PostgREST API)

## 🔐 Environment Variables

### Trước (MongoDB + OpenAI):
```
MONGODB_URI
NEXTAUTH_SECRET
OPENAI_API_KEY
```

### Sau (Supabase + Gemini):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GOOGLE_GEMINI_API_KEY
```

## 💾 Database Schema

### Bảng chính (tạo bởi migrations.sql):
1. **users** - Người dùng
2. **chat_history** - Lịch sử chat
3. **quizzes** - Danh sách đề thi
4. **documents** - Tài liệu học

### Tính năng Supabase tích hợp:
- Row Level Security (RLS) - quản lý quyền truy cập
- Real-time subscriptions - cập nhật tức thời
- Authentication - đăng nhập tích hợp

## ✨ Lợi ích Mới

✅ **Supabase:**
- PostgreSQL mạnh mẽ
- Realtime capabilities
- Built-in authentication
- Free tier thoáng (500MB)
- Không cần quản lý server

✅ **Google Gemini:**
- Miễn phí và thoáng (60 req/min)
- Hỗ trợ tiếng Việt tốt
- Interface đơn giản
- Khác kỹ thuật OpenAI

## 📝 Next Steps

1. Tạo Supabase project + DB migrations
2. Cấu hình environment variables
3. Chạy `npm run dev`
4. Thêm authentication (optional)
5. Seed sample data

Xem [SETUP_GUIDE.md](./SETUP_GUIDE.md) để biết chi tiết!
