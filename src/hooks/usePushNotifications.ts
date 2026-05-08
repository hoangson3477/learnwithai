'use client';

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      logger.warn('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      logger.warn('Cannot show notification - permission not granted');
      return;
    }

    try {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'learnwithai-notification',
        requireInteraction: false,
        ...options,
      });
    } catch (error) {
      logger.error('Error showing notification:', error);
    }
  }, [isSupported, permission]);

  const notifyStudyReminder = useCallback(() => {
    showNotification('⏰ Nhắc nhở học tập', {
      body: 'Đã đến lúc học bài! Giữ vững chuỗi học tập của bạn nhé 🔥',
      tag: 'study-reminder',
    });
  }, [showNotification]);

  const notifyLessonComplete = useCallback((lessonTitle: string) => {
    showNotification('🎉 Hoàn thành bài học!', {
      body: `Bạn vừa hoàn thành "${lessonTitle}". Tiếp tục phát huy nhé!`,
      tag: 'lesson-complete',
    });
  }, [showNotification]);

  const notifyStreak = useCallback((streak: number) => {
    showNotification(`🔥 Chuỗi ${streak} ngày!`, {
      body: `Tuyệt vời! Bạn đã học ${streak} ngày liên tiếp. Giữ vững nhé!`,
      tag: 'streak-notification',
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    notifyStudyReminder,
    notifyLessonComplete,
    notifyStreak,
  };
}

export default usePushNotifications;
