'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/db/supabase';
import { useAuth } from '@/contexts/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logger } from '@/lib/logger';

interface ReminderSettings {
  dailyReminder: boolean;
  dailyTime: string; // HH:MM format
  streakReminder: boolean;
  weeklyReport: boolean;
  weeklyDay: number; // 0 = Sunday, 6 = Saturday
  studyGoalMinutes: number;
}

interface Reminder {
  id: string;
  user_id: string;
  type: 'daily' | 'streak' | 'weekly' | 'goal';
  message: string;
  scheduled_for: string;
  sent: boolean;
  created_at: string;
}

export function useStudyReminders() {
  const { user } = useAuth();
  const { notifyStudyReminder, notifyStreak } = usePushNotifications();
  const [settings, setSettings] = useState<ReminderSettings>({
    dailyReminder: true,
    dailyTime: '19:00',
    streakReminder: true,
    weeklyReport: true,
    weeklyDay: 0, // Sunday
    studyGoalMinutes: 30,
  });
  const [isEnabled, setIsEnabled] = useState(false);

  // Load reminder settings
  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('reminder_settings')
        .eq('id', user.id)
        .single();

      if (userData?.reminder_settings) {
        setSettings(userData.reminder_settings);
      }

      // Check notification permission
      if ('Notification' in window) {
        setIsEnabled(Notification.permission === 'granted');
      }
    } catch (error) {
      logger.error('Error loading reminder settings:', error);
    }
  };

  // Save reminder settings
  const saveSettings = async (newSettings: ReminderSettings) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          reminder_settings: newSettings,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSettings(newSettings);
      logger.info('Reminder settings saved:', newSettings);
    } catch (error) {
      logger.error('Error saving reminder settings:', error);
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setIsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        logger.info('Notification permission granted');
      } else {
        logger.warn('Notification permission denied');
      }
      
      return permission === 'granted';
    }
    return false;
  };

  // Schedule daily reminder
  const scheduleDailyReminder = async () => {
    if (!settings.dailyReminder || !user?.id) return;

    const [hours, minutes] = settings.dailyTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    try {
      await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          type: 'daily',
          message: 'Đã đến lúc học! Hãy hoàn thành mục tiêu học tập hôm nay của bạn.',
          scheduled_for: scheduledTime.toISOString(),
          sent: false,
        });

      logger.info('Daily reminder scheduled:', scheduledTime);
    } catch (error) {
      logger.error('Error scheduling daily reminder:', error);
    }
  };

  // Check and send due reminders
  const checkAndSendReminders = async () => {
    if (!user?.id || !isEnabled) return;

    try {
      const now = new Date().toISOString();
      
      // Get unsent reminders that are due
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('sent', false)
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (reminders && reminders.length > 0) {
        for (const reminder of reminders) {
          // Send notification
          switch (reminder.type) {
            case 'daily':
              notifyStudyReminder();
              break;
            case 'streak':
              notifyStreak(3); // Example: 3 day streak
              break;
            case 'weekly':
              // Weekly report notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('📊 Báo cáo tuần', {
                  body: 'Xem báo cáo học tập tuần này của bạn!',
                  icon: '/icon-192x192.png',
                  tag: 'weekly-report',
                });
              }
              break;
            case 'goal':
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🎯 Mục tiêu học tập', {
                  body: reminder.message,
                  icon: '/icon-192x192.png',
                  tag: 'study-goal',
                });
              }
              break;
          }

          // Mark as sent
          await supabase
            .from('reminders')
            .update({ sent: true })
            .eq('id', reminder.id);
        }
      }
    } catch (error) {
      logger.error('Error checking reminders:', error);
    }
  };

  // Send streak reminder when user is about to lose streak
  const checkStreakRisk = async () => {
    if (!settings.streakReminder || !user?.id) return;

    try {
      // Get last study date
      const { data: userData } = await supabase
        .from('users')
        .select('last_study_date, streak_count')
        .eq('id', user.id)
        .single();

      if (userData?.last_study_date) {
        const lastStudy = new Date(userData.last_study_date);
        const now = new Date();
        const hoursSinceLastStudy = (now.getTime() - lastStudy.getTime()) / (1000 * 60 * 60);

        // If it's been more than 20 hours since last study, send reminder
        if (hoursSinceLastStudy > 20 && userData.streak_count > 0) {
          await supabase
            .from('reminders')
            .insert({
              user_id: user.id,
              type: 'streak',
              message: `Sắp mất chuỗi ${userData.streak_count} ngày! Học ngay để giữ vững chuỗi.`,
              scheduled_for: new Date().toISOString(),
              sent: false,
            });
        }
      }
    } catch (error) {
      logger.error('Error checking streak risk:', error);
    }
  };

  // Schedule weekly report
  const scheduleWeeklyReport = async () => {
    if (!settings.weeklyReport || !user?.id) return;

    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(9, 0, 0, 0); // 9 AM Sunday

    try {
      await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          type: 'weekly',
          message: 'Báo cáo học tập tuần đã sẵn sàng!',
          scheduled_for: nextSunday.toISOString(),
          sent: false,
        });

      logger.info('Weekly report scheduled:', nextSunday);
    } catch (error) {
      logger.error('Error scheduling weekly report:', error);
    }
  };

  // Check if user met daily goal
  const checkDailyGoal = async () => {
    if (!settings.studyGoalMinutes || !user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's study time
      const { data: events } = await supabase
        .from('learning_events')
        .select('metadata')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const totalMinutes = events?.reduce((sum, event) => {
        return sum + (event.metadata?.duration || 0);
      }, 0) || 0;

      // If goal is met and not already notified
      if (totalMinutes >= settings.studyGoalMinutes) {
        await supabase
          .from('reminders')
          .insert({
            user_id: user.id,
            type: 'goal',
            message: `🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu ${settings.studyGoalMinutes} phút học hôm nay!`,
            scheduled_for: new Date().toISOString(),
            sent: false,
          });
      }
    } catch (error) {
      logger.error('Error checking daily goal:', error);
    }
  };

  // Enable/disable reminders
  const toggleReminders = async (enabled: boolean) => {
    if (!enabled && !await requestPermission()) {
      return false;
    }

    setIsEnabled(enabled);
    
    if (enabled) {
      // Schedule all reminder types
      await scheduleDailyReminder();
      await scheduleWeeklyReport();
    }

    return enabled;
  };

  // Update specific setting
  const updateSetting = async (key: keyof ReminderSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);

    // Reschedule if time settings changed
    if (key === 'dailyTime' || key === 'dailyReminder') {
      await scheduleDailyReminder();
    } else if (key === 'weeklyDay' || key === 'weeklyReport') {
      await scheduleWeeklyReport();
    }
  };

  // Check reminders periodically
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      checkAndSendReminders();
      checkStreakRisk();
      checkDailyGoal();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isEnabled, settings, user?.id]);

  // Initial load
  useEffect(() => {
    loadSettings();
    
    // Set up periodic scheduling
    const scheduleInterval = setInterval(() => {
      scheduleDailyReminder();
      scheduleWeeklyReport();
    }, 60 * 60 * 1000); // Reschedule every hour

    return () => clearInterval(scheduleInterval);
  }, [settings, user?.id]);

  return {
    settings,
    isEnabled,
    requestPermission,
    saveSettings,
    toggleReminders,
    updateSetting,
    scheduleDailyReminder,
    scheduleWeeklyReport,
  };
}

export default useStudyReminders;
