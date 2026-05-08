'use client';

import { SkeletonStatCard, SkeletonQuickAction, SkeletonDocumentCard } from './Skeleton';
import { Skeleton } from './Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 bg-white/30 mb-2" />
          <Skeleton className="h-5 w-48 bg-white/20" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonQuickAction />
          <SkeletonQuickAction />
          <SkeletonQuickAction />
        </div>

        {/* Documents Section */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonDocumentCard />
            <SkeletonDocumentCard />
            <SkeletonDocumentCard />
            <SkeletonDocumentCard />
            <SkeletonDocumentCard />
            <SkeletonDocumentCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
