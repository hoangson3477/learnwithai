'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/db/supabase';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'quiz' | 'social' | 'milestone';
  points: number;
  requirement_type: 'quiz_count' | 'streak_days' | 'study_minutes' | 'chat_messages' | 'lessons_completed';
  requirement_value: number;
  unlocked_at?: string;
}

interface UserAchievement {
  achievement_id: string;
  user_id: string;
  unlocked_at: string;
}

// Predefined achievements
const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  {
    id: 'streak_1',
    name: 'Bắt đầu',
    description: 'Học 1 ngày liên tiếp',
    icon: '🔥',
    category: 'streak',
    points: 10,
    requirement_type: 'streak_days',
    requirement_value: 1,
  },
  {
    id: 'streak_3',
    name: 'Khởi động',
    description: 'Học 3 ngày liên tiếp',
    icon: '🔥🔥',
    category: 'streak',
    points: 30,
    requirement_type: 'streak_days',
    requirement_value: 3,
  },
  {
    id: 'streak_7',
    name: 'Tuần đầu tiên',
    description: 'Học 7 ngày liên tiếp',
    icon: '🔥🔥🔥',
    category: 'streak',
    points: 100,
    requirement_type: 'streak_days',
    requirement_value: 7,
  },
  {
    id: 'streak_30',
    name: 'Một tháng!',
    description: 'Học 30 ngày liên tiếp',
    icon: '🏆',
    category: 'streak',
    points: 500,
    requirement_type: 'streak_days',
    requirement_value: 30,
  },

  // Quiz achievements
  {
    id: 'quiz_1',
    name: 'Bắt đầu thử thách',
    description: 'Hoàn thành bài quiz đầu tiên',
    icon: '✅',
    category: 'quiz',
    points: 20,
    requirement_type: 'quiz_count',
    requirement_value: 1,
  },
  {
    id: 'quiz_5',
    name: 'Người ham học',
    description: 'Hoàn thành 5 bài quiz',
    icon: '📚',
    category: 'quiz',
    points: 50,
    requirement_type: 'quiz_count',
    requirement_value: 5,
  },
  {
    id: 'quiz_10',
    name: 'Quiz master',
    description: 'Hoàn thành 10 bài quiz',
    icon: '🎯',
    category: 'quiz',
    points: 100,
    requirement_type: 'quiz_count',
    requirement_value: 10,
  },

  // Learning achievements
  {
    id: 'lesson_1',
    name: 'Bài học đầu tiên',
    description: 'Hoàn thành bài học đầu tiên',
    icon: '📖',
    category: 'learning',
    points: 15,
    requirement_type: 'lessons_completed',
    requirement_value: 1,
  },
  {
    id: 'lesson_5',
    name: 'Học chăm chỉ',
    description: 'Hoàn thành 5 bài học',
    icon: '📚',
    category: 'learning',
    points: 40,
    requirement_type: 'lessons_completed',
    requirement_value: 5,
  },

  // Social achievements
  {
    id: 'chat_10',
    name: 'Tò mò',
    description: 'Gửi 10 tin nhắn chat',
    icon: '💬',
    category: 'social',
    points: 25,
    requirement_type: 'chat_messages',
    requirement_value: 10,
  },
  {
    id: 'chat_50',
    name: 'Nhiều câu hỏi',
    description: 'Gửi 50 tin nhắn chat',
    icon: '🗣️',
    category: 'social',
    points: 75,
    requirement_type: 'chat_messages',
    requirement_value: 50,
  },
];

export function useAchievements() {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [totalPoints, setTotalPoints] = useState(0);

  // Check and unlock achievements
  const checkAchievements = async (stats: {
    streakDays: number;
    quizCount: number;
    lessonsCompleted: number;
    chatMessages: number;
    studyMinutes: number;
  }) => {
    if (!user?.id) return;

    try {
      // Get user's current achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

      // Check each achievement
      const newUnlocks: Achievement[] = [];
      
      for (const achievement of ACHIEVEMENTS) {
        if (unlockedIds.has(achievement.id)) continue;

        let isUnlocked = false;
        const requirement = achievement.requirement_value;

        switch (achievement.requirement_type) {
          case 'streak_days':
            isUnlocked = stats.streakDays >= requirement;
            break;
          case 'quiz_count':
            isUnlocked = stats.quizCount >= requirement;
            break;
          case 'lessons_completed':
            isUnlocked = stats.lessonsCompleted >= requirement;
            break;
          case 'chat_messages':
            isUnlocked = stats.chatMessages >= requirement;
            break;
          case 'study_minutes':
            isUnlocked = stats.studyMinutes >= requirement;
            break;
        }

        if (isUnlocked) {
          newUnlocks.push(achievement);
          
          // Unlock in database
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
              unlocked_at: new Date().toISOString(),
            });

          // Update user points
          await supabase
            .from('users')
            .update({
              total_points: (totalPoints || 0) + achievement.points,
            })
            .eq('id', user.id);

          // Show notification
          showAchievementNotification(achievement);
        }
      }

      if (newUnlocks.length > 0) {
        await loadUserAchievements();
      }

    } catch (error) {
      logger.error('Error checking achievements:', error);
    }
  };

  // Load user's achievements
  const loadUserAchievements = async () => {
    if (!user?.id) return;

    try {
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          unlocked_at,
          achievements!inner(
            id,
            name,
            description,
            icon,
            category,
            points
          )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (userAchievements) {
        const achievements = userAchievements.map((ua: any) => ua.achievements) as Achievement[];
        setUnlockedAchievements(achievements);

        // Calculate total points
        const points = achievements.reduce((sum, a) => sum + a.points, 0);
        setTotalPoints(points);

        // Update available achievements
        const unlockedIds = new Set(achievements.map(a => a.id));
        const available = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));
        setAvailableAchievements(available);
      }
    } catch (error) {
      logger.error('Error loading achievements:', error);
    }
  };

  // Show achievement notification
  const showAchievementNotification = (achievement: Achievement) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏆 Thành tựu mới!', {
        body: `${achievement.name}: ${achievement.description}`,
        icon: '/icon-192x192.png',
        tag: 'achievement-unlock',
      });
    }

    // Also show in-app notification (could integrate with a toast system)
    logger.info('Achievement unlocked:', achievement);
  };

  // Get achievements by category
  const getAchievementsByCategory = (category: Achievement['category']) => {
    return {
      unlocked: unlockedAchievements.filter(a => a.category === category),
      available: availableAchievements.filter(a => a.category === category),
    };
  };

  // Get progress for specific achievement
  const getAchievementProgress = (achievement: Achievement, currentStats: any) => {
    const current = currentStats[achievement.requirement_type] || 0;
    const required = achievement.requirement_value;
    const progress = Math.min((current / required) * 100, 100);
    
    return {
      current,
      required,
      progress,
      isUnlocked: progress >= 100,
    };
  };

  useEffect(() => {
    loadUserAchievements();
  }, [user?.id]);

  return {
    unlockedAchievements,
    availableAchievements,
    totalPoints,
    checkAchievements,
    loadUserAchievements,
    getAchievementsByCategory,
    getAchievementProgress,
  };
}

export default useAchievements;
