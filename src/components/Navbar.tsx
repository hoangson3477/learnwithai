'use client';

import { useAuth } from '@/contexts/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b-4 border-green-500">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 font-bold text-2xl text-green-600">
          <span>🎓</span>
          <span>Học với AI</span>
        </Link>

        {user ? (
          <>
            {/* Desktop Navigation - Logged In */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/lessons"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                📚 Bài học
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                🏆 Xếp hạng
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                📊 Bảng điều khiển
              </Link>
              <Link
                href="/roadmap"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                🗺️ Lộ trình
              </Link>
              <Link
                href="/forum"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                💬 Diễn Đàn
              </Link>
              <Link
                href="/setup"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                ⚙️ Thiết lập
              </Link>
              {profile?.role === 'web_admin' && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
                >
                  🛠️ Admin
                </Link>
              )}

              {/* User Menu */}
              <div className="relative ml-4">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition font-medium flex items-center space-x-2"
                >
                  <span>👤</span>
                  <span className="truncate max-w-[100px]">{user.email}</span>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition font-medium rounded-b-lg"
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation - Logged In */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-700 text-2xl"
              >
                ☰
              </button>

              {showMenu && (
                <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl border border-gray-200 w-48">
                  <Link
                    href="/lessons"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    📚 Bài học
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    🏆 Xếp hạng
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    📊 Bảng điều khiển
                  </Link>
                  <Link
                    href="/roadmap"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    🗺️ Lộ trình
                  </Link>
                  <Link
                    href="/forum"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    💬 Diễn Đàn
                  </Link>
                  <Link
                    href="/setup"
                    className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                  >
                    ⚙️ Thiết lập
                  </Link>
                  {profile?.role === 'web_admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-3 text-gray-700 hover:bg-green-50 transition font-medium"
                    >
                      🛠️ Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition font-medium border-t"
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Navigation - Not Logged In */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-gray-700 hover:text-green-600 transition font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
              >
                Đăng ký
              </Link>
            </div>

            {/* Mobile Navigation - Not Logged In */}
            <div className="md:hidden flex items-center space-x-2">
              <Link
                href="/auth/login"
                className="px-3 py-2 text-gray-700 hover:text-green-600 text-sm font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 text-sm font-medium"
              >
                Đăng ký
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
