'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/db/supabase';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface StreakData {
  currentStreak: number;
  lastStudyDate: string | null;
  totalStudyDays: number;
  longestStreak: number;
}

export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastStudyDate: null,
    totalStudyDays: 0,
    longestStreak: 0,
  });

  // Update streak when user completes any learning activity
  const updateStreak = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get current streak data
      const { data: userData } = await supabase
        .from('users')
        .select('last_study_date, streak_count, total_study_days, longest_streak')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      const lastStudyDate = userData.last_study_date;
      const currentStreak = userData.streak_count || 0;
      const totalStudyDays = userData.total_study_days || 0;
      const longestStreak = userData.longest_streak || 0;

      let newStreak = currentStreak;
      let newTotalDays = totalStudyDays;
      let newLongestStreak = longestStreak;

      // Calculate new streak
      if (lastStudyDate === today) {
        // Already studied today, no change
        return;
      } else if (lastStudyDate === getYesterday()) {
        // Studied yesterday, increment streak
        newStreak = currentStreak + 1;
        newTotalDays = totalStudyDays + 1;
      } else {
        // Missed yesterday, reset streak
        newStreak = 1;
        newTotalDays = totalStudyDays + 1;
      }

      // Update longest streak if needed
      if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
      }

      // Update database
      const { error } = await supabase
        .from('users')
        .update({
          last_study_date: today,
          streak_count: newStreak,
          total_study_days: newTotalDays,
          longest_streak: newLongestStreak,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setStreakData({
        currentStreak: newStreak,
        lastStudyDate: today,
        totalStudyDays: newTotalDays,
        longestStreak: newLongestStreak,
      });

      logger.info('Streak updated:', { newStreak, newTotalDays });
      
      // Show notification for milestones
      if (newStreak === 1) {
        showNotification('🔥 Bắt đầu chuỗi mới!', `Học mỗi ngày để duy trì động lực!`);
      } else if (newStreak === 7) {
        showNotification('🎉 Tuần đầu tiên!', `Bạn đã học ${newStreak} ngày liên tiếp!`);
      } else if (newStreak === 30) {
        showNotification('🏆 Một tháng!', `Thật tuyệt vời! ${newStreak} ngày học liên tiếp!`);
      } else if (newStreak % 10 === 0) {
        showNotification(`🔥 ${newStreak} ngày!`, `Giữ vững chuỗi học tập của bạn!`);
      }

    } catch (error) {
      logger.error('Error updating streak:', error);
    }
  };

  // Get yesterday's date in YYYY-MM-DD format
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Show notification helper
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        tag: 'streak-milestone',
      });
    }
  };

  // Load current streak data
  const loadStreakData = async () => {
    if (!user?.id) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('last_study_date, streak_count, total_study_days, longest_streak')
        .eq('id', user.id)
        .single();

      if (userData) {
        setStreakData({
          currentStreak: userData.streak_count || 0,
          lastStudyDate: userData.last_study_date,
          totalStudyDays: userData.total_study_days || 0,
          longestStreak: userData.longest_streak || 0,
        });
      }
    } catch (error) {
      logger.error('Error loading streak data:', error);
    }
  };

  useEffect(() => {
    loadStreakData();
  }, [user?.id]);

  return {
    ...streakData,
    updateStreak,
    refreshStreak: loadStreakData,
  };
}

export default useStreak;
