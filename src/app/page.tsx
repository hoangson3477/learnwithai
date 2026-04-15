'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            🎓 Học với AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Học tiếng ngoại, lập trình, toán học và nhiều hơn nữa với AI tutor cá nhân hóa. Học mỗi ngày, giành điểm, và leo cấp!
          </p>
        </div>

        <div className="space-x-4">
          {user ? (
            <Link
              href="/lessons"
              className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold transition shadow-lg"
            >
              ▶️ Bắt đầu học ngay
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold transition shadow-lg"
              >
                Đăng ký miễn phí
              </Link>
              <Link
                href="/auth/login"
                className="inline-block border-2 border-green-500 text-green-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-green-50 transition"
              >
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
          Tại sao chọn Học với AI?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="p-6 bg-green-50 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Học với AI</h3>
            <p className="text-gray-600">
              Trợ lý AI cá nhân hóa giúp bạn học theo tốc độ của riêng mình
            </p>
          </div>

          <div className="p-6 bg-blue-50 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gamification</h3>
            <p className="text-gray-600">
              Giành điểm, leo cấp và duy trì streak để giữ động lực
            </p>
          </div>

          <div className="p-6 bg-purple-50 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Hiệu quả</h3>
            <p className="text-gray-600">
              Bài học ngắn, dễ nhớ, được thiết kế khoa học để tối ưu hóa học tập
            </p>
          </div>

          <div className="p-6 bg-orange-50 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-5xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Tiến độ</h3>
            <p className="text-gray-600">
              Theo dõi tiến độ học tập với dashboard chi tiết và thống kê
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center bg-green-500 text-white">
        <h3 className="text-4xl font-bold mb-4">Sẵn sàng bắt đầu không?</h3>
        <p className="text-lg mb-8">
          Miễn phí. Nhanh. Rất hiệu quả. Chọn một chủ đề và bắt đầu học hôm nay!
        </p>
        {user ? (
          <Link
            href="/lessons"
            className="inline-block bg-white text-green-600 px-8 py-3 rounded-full hover:bg-gray-100 font-bold text-lg transition"
          >
            Vào bài học
          </Link>
        ) : (
          <Link
            href="/auth/register"
            className="inline-block bg-white text-green-600 px-8 py-3 rounded-full hover:bg-gray-100 font-bold text-lg transition"
          >
            Đăng ký ngay
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white text-center py-6">
        <p>&copy; 2024 Học với AI. Tất cả quyền được bảo lưu</p>
      </footer>
    </main>
  );
}
