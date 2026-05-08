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
  UserPlus,
  ChevronDown,
  Target,
  BarChart3,
  Award,
  Bell
} from 'lucide-react';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showLearningDropdown, setShowLearningDropdown] = useState(false);
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const learningItems = [
    { href: '/lessons', icon: BookOpen, label: 'Bài học' },
    { href: '/quiz', icon: Target, label: 'Quiz' },
    { href: '/flashcards', icon: Award, label: 'Flashcards' },
    { href: '/documents', icon: BookOpen, label: 'Tài liệu' },
    { href: '/mindmaps', icon: Map, label: 'Sơ đồ tư duy' },
  ];

  const analyticsItems = [
    { href: '/analytics', icon: BarChart3, label: 'Phân tích' },
    { href: '/achievements', icon: Trophy, label: 'Thành tựu' },
    { href: '/leaderboard', icon: Trophy, label: 'Xếp hạng' },
  ];

  const socialItems = [
    { href: '/forum', icon: MessageSquare, label: 'Diễn đàn' },
    { href: '/roadmap', icon: Map, label: 'Lộ trình' },
    { href: '/studyspace', icon: LayoutDashboard, label: 'Không gian học' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-slate-800 hover:text-indigo-600 transition">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">Học với AI</span>
          </Link>

          {user ? (
            <>
              {/* Desktop Navigation - Logged In */}
              <div className="hidden lg:flex items-center space-x-1">
                {/* Learning Dropdown */}
                <div className="relative"
                     onMouseEnter={() => setShowLearningDropdown(true)}
                     onMouseLeave={() => setShowLearningDropdown(false)}>
                  <button
                    className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Học tập</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showLearningDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                      {learningItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Analytics Dropdown */}
                <div className="relative"
                     onMouseEnter={() => setShowAnalyticsDropdown(true)}
                     onMouseLeave={() => setShowAnalyticsDropdown(false)}>
                  <button
                    className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Phân tích</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showAnalyticsDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                      {analyticsItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Social Items */}
                {socialItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  );
                })}

                {/* Dashboard */}
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden xl:inline">Bảng điều khiển</span>
                </Link>

                {/* Settings */}
                <Link
                  href="/settings"
                  className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden xl:inline">Cài đặt</span>
                </Link>

                {/* Admin */}
                {profile?.role === 'web_admin' && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    <span className="hidden xl:inline">Admin</span>
                  </Link>
                )}

                {/* User Menu */}
                <div className="relative ml-2">
                  <button
                    onMouseEnter={() => setShowMenu(true)}
                    onMouseLeave={() => setShowMenu(false)}
                    className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 rounded-lg hover:from-indigo-100 hover:to-purple-100 transition font-medium flex items-center space-x-2 border border-indigo-200"
                  >
                    <User className="w-4 h-4" />
                    <span className="truncate max-w-[80px] hidden lg:inline">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 transition font-medium"
                      >
                        <User className="w-4 h-4" />
                        <span>Hồ sơ</span>
                      </Link>
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

              {/* Mobile Navigation Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Navigation - Not Logged In */}
              <div className="hidden lg:flex items-center space-x-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-medium flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký</span>
                </Link>
              </div>

              {/* Mobile Navigation - Not Logged In */}
              <div className="lg:hidden flex items-center space-x-2">
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
      </div>

      {/* Mobile Menu Overlay */}
      {user && showMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMenu(false)}>
          <div className="absolute top-16 right-4 bg-white rounded-xl shadow-xl border border-slate-200 w-72 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Mobile Learning Section */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Học tập</span>
              </h3>
              <div className="space-y-1">
                {learningItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                      onClick={() => setShowMenu(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Analytics Section */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Phân tích</span>
              </h3>
              <div className="space-y-1">
                {analyticsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                      onClick={() => setShowMenu(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Social Section */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Cộng đồng</span>
              </h3>
              <div className="space-y-1">
                {socialItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                      onClick={() => setShowMenu(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Other Section */}
            <div className="p-4">
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                  onClick={() => setShowMenu(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Bảng điều khiển</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Cài đặt</span>
                </Link>
                {profile?.role === 'web_admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50 rounded-lg transition font-medium"
                    onClick={() => setShowMenu(false)}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
