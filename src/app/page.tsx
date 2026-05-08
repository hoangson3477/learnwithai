'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth';
import { FadeInOnScroll } from '@/components/PageTransition';
import { 
  GraduationCap, 
  Zap, 
  Gamepad2, 
  Target, 
  TrendingUp, 
  ArrowRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <section className="text-center py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
            Học với AI
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Học tiếng ngoại, lập trình, toán học và nhiều hơn nữa với AI tutor cá nhân hóa. 
            Học mỗi ngày, giành điểm, và leo cấp!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/lessons"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
              >
                <BookOpen className="w-5 h-5" />
                <span>Bắt đầu học ngay</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Đăng ký miễn phí</span>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-indigo-500 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-200"
                >
                  <span>Đăng nhập</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-800 mb-4">
            Tại sao chọn Học với AI?
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Khám phá những tính năng độc đáo giúp việc học tập trở nên thú vị và hiệu quả hơn
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FadeInOnScroll delay={0}>
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 hover:shadow-lg transition-all duration-200 group card-hover">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Học với AI</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Trợ lý AI cá nhân hóa giúp bạn học theo tốc độ của riêng mình
                </p>
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={100}>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 hover:shadow-lg transition-all duration-200 group card-hover">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Gamification</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Giành điểm, leo cấp và duy trì streak để giữ động lực
                </p>
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={200}>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:shadow-lg transition-all duration-200 group card-hover">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Hiệu quả</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Bài học ngắn, dễ nhớ, được thiết kế khoa học để tối ưu hóa học tập
                </p>
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={300}>
              <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-100 hover:shadow-lg transition-all duration-200 group card-hover">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Tiến độ</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Theo dõi tiến độ học tập với dashboard chi tiết và thống kê
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-4xl font-bold mb-4">Sẵn sàng bắt đầu không?</h3>
          <p className="text-lg mb-8 text-indigo-100">
            Miễn phí. Nhanh. Rất hiệu quả. Chọn một chủ đề và bắt đầu học hôm nay!
          </p>
          {user ? (
            <Link
              href="/lessons"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-200 shadow-lg"
            >
              <BookOpen className="w-5 h-5" />
              <span>Vào bài học</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-200 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              <span>Đăng ký ngay</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white text-center py-8">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-slate-400 text-sm">
            &copy; 2026 Sản phẩm được làm ra để phục vụ cho cuộc thi Tin học trẻ, mọi sai sót có thể diễn ra, hãy kiểm tra kĩ
          </p>
        </div>
      </footer>
    </main>
  );
}
