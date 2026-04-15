'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LocalePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'vi';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-3">LearnWithAI ({locale})</h1>
        <p className="text-gray-600 mb-6">
          Phiên bản theo ngôn ngữ đang hoạt động. Bạn có thể truy cập nhanh các tính năng chính bên dưới.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard" className="bg-indigo-600 text-white px-4 py-3 rounded text-center">
            Dashboard
          </Link>
          <Link href="/roadmap" className="bg-violet-600 text-white px-4 py-3 rounded text-center">
            Roadmap
          </Link>
        </div>
      </div>
    </div>
  );
}
