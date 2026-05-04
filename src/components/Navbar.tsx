'use client';

import { useAuth } from '@/contexts/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  LayoutDashboard, 
  Map, 
  MessageSquare, 
  Settings, 
  Wrench, 
  LogOut, 
  Menu, 
  X, 
  User,
  LogIn,
  UserPlus
} from 'lucide-react';

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
    <nav className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-slate-800 hover:text-indigo-600 transition">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span>Học với AI</span>
        </Link>

        {user ? (
          <>
            {/* Desktop Navigation - Logged In */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/lessons"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Bài học</span>
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>Xếp hạng</span>
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Bảng điều khiển</span>
              </Link>
              <Link
                href="/roadmap"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                <span>Lộ trình</span>
              </Link>
              <Link
                href="/forum"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Diễn Đàn</span>
              </Link>
              <Link
                href="/setup"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Thiết lập</span>
              </Link>
              {profile?.role === 'web_admin' && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}

              {/* User Menu */}
              <div className="relative ml-2">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 rounded-xl hover:from-indigo-100 hover:to-purple-100 transition font-medium flex items-center space-x-2 border border-indigo-200"
                >
                  <User className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{user.email?.split('@')[0] || 'User'}</span>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-slate-700 hover:bg-red-50 hover:text-red-600 transition font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation - Logged In */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              >
                {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {showMenu && (
                <div className="absolute top-16 right-4 bg-white rounded-xl shadow-xl border border-slate-200 w-56 overflow-hidden">
                  <Link
                    href="/lessons"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Bài học</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Xếp hạng</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Bảng điều khiển</span>
                  </Link>
                  <Link
                    href="/roadmap"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <Map className="w-4 h-4" />
                    <span>Lộ trình</span>
                  </Link>
                  <Link
                    href="/forum"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Diễn Đàn</span>
                  </Link>
                  <Link
                    href="/setup"
                    className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Thiết lập</span>
                  </Link>
                  {profile?.role === 'web_admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium flex items-center gap-2"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-slate-700 hover:bg-red-50 hover:text-red-600 transition font-medium flex items-center gap-2 border-t border-slate-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Navigation - Not Logged In */}
            <div className="hidden md:flex items-center space-x-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký</span>
              </Link>
            </div>

            {/* Mobile Navigation - Not Logged In */}
            <div className="md:hidden flex items-center space-x-2">
              <Link
                href="/auth/login"
                className="px-3 py-2 text-slate-600 hover:text-indigo-600 text-sm font-medium flex items-center gap-1"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
