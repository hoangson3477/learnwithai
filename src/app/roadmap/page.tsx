'use client';

import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';

function RoadmapContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">Lộ trình học cá nhân hóa</h1>
        <p className="text-indigo-100">Gợi ý học tiếp theo theo từng môn dựa trên năng lực hiện tại</p>
      </div>
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <RoadmapRecommendations />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <ProtectedPageWrapper>
      <RoadmapContent />
    </ProtectedPageWrapper>
  );
}
