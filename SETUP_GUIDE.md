# 🚀 Supabase + Gemini Setup Guide

## Các bước cài đặt

### 1️⃣ Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Click "New Project"
3. Điền thông tin:
   - Project name: `learnwithai`
   - Database password: Lưu vào nơi an toàn
   - Region: Chọn gần nhất
4. Click "Create new project"
5. Chờ ~5 phút để project khởi tạo

### 2️⃣ Chạy Database Migrations

1. Mở **SQL Editor** trong Supabase
2. Click "New Query"
3. Copy nội dung từ file: `src/lib/db/migrations.sql`
4. Paste vào SQL Editor
5. Click "RUN" (hay Ctrl+Enter)
6. Xác nhận: Tất cả queries chạy thành công ✓

### 3️⃣ Lấy Supabase Keys

1. Truy cập **Settings → API**
2. Copy **3 giá trị**:
   - `Project URL` (giữ cả phần `https://`)
   - `Anon` key (dưới "anon [public]")
   - `Service Role Secret` (dưới "service_role [secret]") - **QUAN TRỌNG cho auth**
3. Cập nhật `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1...
   SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1... (giữ bí mật!)
   ```

### 4️⃣ Lấy Google Gemini API Key

1. Truy cập [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key"
3. Chọn "Create API key in new Google Cloud project"
4. Copy API key mới tạo
5. Cập nhật `.env.local`:
   ```
   GOOGLE_GEMINI_API_KEY=AIzaSyD...
   ```

### 5️⃣ Chạy Development Server

```bash
npm run dev
```

Mở: http://localhost:3000 (hoặc port được hiển thị)

## ✅ Kiểm tra Setup

- [ ] Supabase project đã tạo
- [ ] Database migrations chạy thành công
- [ ] `.env.local` có cả 3 keys
- [ ] `npm run dev` chạy mà không lỗi
- [ ] Truy cập http://localhost:3000 thành công

## 🎯 Giải pháp vấn đề thường gặp

**Lỗi: "Cannot reach Supabase"**
- Kiểm tra URL có đúng không (kết thúc bằng `.supabase.co`)
- Kiểm tra Anon key không sai

**Lỗi: "Invalid Gemini API key"**
- Đảm bảo key có tiền tố `AIza...`
- Kiểm tra Gemini API được enable trong Google Cloud Console

**Chat không hoạt động**
- Kiểm tra `GOOGLE_GEMINI_API_KEY` trong `.env.local`
- Check Google Cloud Console quota (free: 60 req/min)

## 📊 Free Tier Limits

### Supabase
- Database: 500MB
- API: Unlimited (nhưng rate limit hợp lý)
- Auth: 50,000 users

### Google Gemini
- 60 requests/minute
- 2 triệu tokens/tháng
- Đủ cho học tập

## 🔗 Links hữu ích

- [Supabase Docs](https://supabase.com/docs)
- [Google AI Studio](https://ai.google.dev)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Project README](./README.md)

## ❓ Cần giúp?

Xem troubleshooting section trong README.md hoặc copilot-instructions.md
