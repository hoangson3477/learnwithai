'use client';

import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import ProgressCharts from '@/components/ProgressCharts';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Clock
} from 'lucide-react';

function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            <span>Phân tích học tập</span>
          </h1>
          <p className="text-indigo-100">Theo dõi tiến độ và hiệu suất học tập của bạn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <ProgressCharts />
      </div>
    </div>
  );
}

export default function AnalyticsPageWrapper() {
  return (
    <ProtectedPageWrapper>
      <AnalyticsPage />
    </ProtectedPageWrapper>
  );
}
