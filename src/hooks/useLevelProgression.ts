'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/db/supabase';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

interface Level {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  color: string;
  icon: string;
}

interface UserProgress {
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  progressToNext: number;
  xpToNextLevel: number;
}

// Level definitions
const LEVELS: Level[] = [
  { level: 1, title: 'Người mới bắt đầu', minXP: 0, maxXP: 100, color: 'text-gray-600', icon: '🌱' },
  { level: 2, title: 'Học viên', minXP: 100, maxXP: 250, color: 'text-green-600', icon: '🌿' },
  { level: 3, title: 'Học viên chăm chỉ', minXP: 250, maxXP: 500, color: 'text-blue-600', icon: '🌳' },
  { level: 4, title: 'Nâng cao', minXP: 500, maxXP: 1000, color: 'text-purple-600', icon: '🌲' },
  { level: 5, title: 'Chuyên gia', minXP: 1000, maxXP: 2000, color: 'text-orange-600', icon: '🌳' },
  { level: 6, title: 'Bậc thầy', minXP: 2000, maxXP: 3500, color: 'text-red-600', icon: '🏆' },
  { level: 7, title: 'Huyền thoại', minXP: 3500, maxXP: 5000, color: 'text-yellow-600', icon: '👑' },
  { level: 8, title: 'Siêu việt', minXP: 5000, maxXP: 10000, color: 'text-purple-600', icon: '⭐' },
  { level: 9, title: 'Thần thoại', minXP: 10000, maxXP: 20000, color: 'text-pink-600', icon: '🌟' },
  { level: 10, title: 'Đại sư', minXP: 20000, maxXP: Infinity, color: 'text-indigo-600', icon: '🎯' },
];

// XP rewards for different activities
const XP_REWARDS = {
  quiz_completion: 20,
  quiz_perfect_score: 30,
  lesson_completion: 15,
  daily_login: 5,
  streak_day: 10,
  chat_message: 2,
  flashcard_review: 3,
  achievement_unlock: 50,
};

export function useLevelProgression() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress>({
    currentLevel: 1,
    currentXP: 0,
    totalXP: 0,
    progressToNext: 0,
    xpToNextLevel: 100,
  });

  // Get level info for a given XP amount
  const getLevelFromXP = (xp: number): { level: Level; progress: number } => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXP) {
        const level = LEVELS[i];
        const progress = i === LEVELS.length - 1 
          ? 100 
          : ((xp - level.minXP) / (level.maxXP - level.minXP)) * 100;
        return { level, progress };
      }
    }
    return { level: LEVELS[0], progress: 0 };
  };

  // Add XP to user
  const addXP = async (amount: number, reason: string) => {
    if (!user?.id || amount <= 0) return;

    try {
      // Get current user data
      const { data: userData } = await supabase
        .from('users')
        .select('total_points, current_level')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      const newTotalXP = (userData.total_points || 0) + amount;
      const { level: newLevel } = getLevelFromXP(newTotalXP);

      // Update user data
      const { error } = await supabase
        .from('users')
        .update({
          total_points: newTotalXP,
          current_level: newLevel.level,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      const updatedProgress = calculateProgress(newTotalXP);
      setProgress(updatedProgress);

      // Log XP gain
      await supabase
        .from('xp_history')
        .insert({
          user_id: user.id,
          amount: amount,
          reason: reason,
          created_at: new Date().toISOString(),
        });

      // Check for level up
      if (newLevel.level > (userData.current_level || 1)) {
        await handleLevelUp(newLevel, userData.current_level || 1);
      }

      logger.info('XP added:', { amount, reason, newTotalXP, newLevel: newLevel.level });

    } catch (error) {
      logger.error('Error adding XP:', error);
    }
  };

  // Calculate progress object from total XP
  const calculateProgress = (totalXP: number): UserProgress => {
    const { level, progress } = getLevelFromXP(totalXP);
    const nextLevel = LEVELS.find(l => l.level === level.level + 1);
    
    return {
      currentLevel: level.level,
      currentXP: totalXP,
      totalXP,
      progressToNext: progress,
      xpToNextLevel: nextLevel ? nextLevel.minXP - totalXP : 0,
    };
  };

  // Handle level up notification
  const handleLevelUp = async (newLevel: Level, oldLevel: number) => {
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 Level Up!', {
        body: `Chúc mừng! Bạn đã đạt level ${newLevel.level}: ${newLevel.title}!`,
        icon: '/icon-192x192.png',
        tag: 'level-up',
      });
    }

    // Log level up event
    await supabase
      .from('level_ups')
      .insert({
        user_id: user?.id,
        old_level: oldLevel,
        new_level: newLevel.level,
        created_at: new Date().toISOString(),
      });

    logger.info('User leveled up:', { oldLevel, newLevel: newLevel.level });
  };

  // Award XP for different activities
  const awardXP = {
    forQuiz: async (score?: number) => {
      const baseXP = XP_REWARDS.quiz_completion;
      const bonusXP = score === 100 ? XP_REWARDS.quiz_perfect_score : 0;
      await addXP(baseXP + bonusXP, `Quiz completion${score === 100 ? ' (perfect score!)' : ''}`);
    },
    
    forLesson: async () => {
      await addXP(XP_REWARDS.lesson_completion, 'Lesson completion');
    },
    
    forDailyLogin: async () => {
      await addXP(XP_REWARDS.daily_login, 'Daily login');
    },
    
    forStreak: async () => {
      await addXP(XP_REWARDS.streak_day, 'Streak day');
    },
    
    forChatMessage: async () => {
      await addXP(XP_REWARDS.chat_message, 'Chat message');
    },
    
    forFlashcardReview: async () => {
      await addXP(XP_REWARDS.flashcard_review, 'Flashcard review');
    },
    
    forAchievement: async () => {
      await addXP(XP_REWARDS.achievement_unlock, 'Achievement unlocked');
    },
  };

  // Load user progress
  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('total_points, current_level')
        .eq('id', user.id)
        .single();

      if (userData) {
        const totalXP = userData.total_points || 0;
        const progressData = calculateProgress(totalXP);
        setProgress(progressData);
      }
    } catch (error) {
      logger.error('Error loading progress:', error);
    }
  };

  // Get current level info
  const getCurrentLevel = (): Level => {
    return LEVELS.find(l => l.level === progress.currentLevel) || LEVELS[0];
  };

  // Get next level info
  const getNextLevel = (): Level | null => {
    return LEVELS.find(l => l.level === progress.currentLevel + 1) || null;
  };

  // Get XP history
  const getXPHistory = async (limit = 10) => {
    if (!user?.id) return [];

    try {
      const { data } = await supabase
        .from('xp_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      logger.error('Error fetching XP history:', error);
      return [];
    }
  };

  useEffect(() => {
    loadProgress();
  }, [user?.id]);

  return {
    ...progress,
    currentLevelInfo: getCurrentLevel(),
    nextLevelInfo: getNextLevel(),
    allLevels: LEVELS,
    addXP,
    awardXP,
    loadProgress,
    getXPHistory,
  };
}

export default useLevelProgression;
