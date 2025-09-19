/**
 * Push Notification Service for iOS and Web
 * Handles match reminders and important notifications
 */

class NotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.permission = Notification.permission;
    this.subscription = null;
    this.settings = this.loadSettings();
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      }

      // Check existing permission
      this.permission = Notification.permission;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Notifications not supported');
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      // For iOS, we need to handle the permission request differently
      if (this.isIOS) {
        // iOS requires user interaction
        const result = await Notification.requestPermission();
        this.permission = result;
        return result === 'granted';
      } else {
        const result = await Notification.requestPermission();
        this.permission = result;
        return result === 'granted';
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Cannot subscribe: permission not granted');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.getVAPIDKey()
      });

      this.subscription = subscription;
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer(this.subscription);
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Schedule match reminder notification
   */
  async scheduleMatchReminder(match, reminderTime = 30) {
    if (!this.settings.matchReminders) {
      return;
    }

    const matchDate = new Date(match.date);
    const reminderDate = new Date(matchDate.getTime() - (reminderTime * 60 * 1000));
    const now = new Date();

    if (reminderDate <= now) {
      return; // Too late to schedule
    }

    const delay = reminderDate.getTime() - now.getTime();

    setTimeout(() => {
      this.showNotification({
        title: '⚽ FIFA Match Reminder',
        body: `Match starting in ${reminderTime} minutes: AEK vs Real Madrid`,
        icon: '/assets/icon-180.png',
        badge: '/assets/icon-180.png',
        tag: `match-reminder-${match.id}`,
        data: {
          type: 'match_reminder',
          matchId: match.id,
          url: '/matches'
        },
        actions: [
          {
            action: 'view',
            title: 'View Match',
            icon: '/assets/icon-180.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });
    }, delay);
  }

  /**
   * Send achievement notification
   */
  async notifyAchievement(achievement) {
    if (!this.settings.achievements) {
      return;
    }

    await this.showNotification({
      title: '🏆 Achievement Unlocked!',
      body: achievement.title,
      icon: '/assets/icon-180.png',
      badge: '/assets/icon-180.png',
      tag: `achievement-${achievement.id}`,
      data: {
        type: 'achievement',
        achievementId: achievement.id,
        url: '/stats'
      }
    });
  }

  /**
   * Send goal notification
   */
  async notifyGoal(match, team, scorer) {
    if (!this.settings.goals) {
      return;
    }

    await this.showNotification({
      title: '⚽ GOAL!',
      body: `${scorer} scored for ${team}!`,
      icon: '/assets/icon-180.png',
      badge: '/assets/icon-180.png',
      tag: `goal-${match.id}-${Date.now()}`,
      data: {
        type: 'goal',
        matchId: match.id,
        url: '/matches'
      }
    });
  }

  /**
   * Send event notification
   */
  async notifyEvent(event) {
    if (!this.settings.events) {
      return;
    }

    await this.showNotification({
      title: `🎉 ${event.name}`,
      body: event.description,
      icon: '/assets/icon-180.png',
      badge: '/assets/icon-180.png',
      tag: `event-${event.id}`,
      data: {
        type: 'event',
        eventId: event.id,
        url: '/events'
      }
    });
  }

  /**
   * Show notification (local or push)
   */
  async showNotification(options) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon,
          badge: options.badge,
          tag: options.tag,
          data: options.data,
          actions: options.actions || [],
          vibrate: this.isIOS ? undefined : [200, 100, 200],
          requireInteraction: false,
          silent: false
        });
      } else {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag,
          data: options.data
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('fifa-tracker-notification-settings', JSON.stringify(this.settings));
  }

  /**
   * Load notification settings
   */
  loadSettings() {
    const saved = localStorage.getItem('fifa-tracker-notification-settings');
    const defaults = {
      matchReminders: true,
      goals: true,
      achievements: true,
      events: true,
      reminderTime: 30 // minutes before match
    };
    
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  /**
   * Get VAPID public key for push subscriptions
   */
  getVAPIDKey() {
    // This would be your actual VAPID key
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxazjqak_7kYDjLE2cI5GkJM-5z9z9LzsQI7JClZgZmKjgKrRxfQ';
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      // This would send to your backend server
      console.log('Would send subscription to server:', subscription);
      // await fetch('/api/notifications/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription)
      // });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription) {
    try {
      console.log('Would remove subscription from server:', subscription);
      // await fetch('/api/notifications/unsubscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription)
      // });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  /**
   * Test notification functionality
   */
  async testNotification() {
    await this.showNotification({
      title: '🧪 Test Notification',
      body: 'FUSTA notifications are working!',
      icon: '/assets/icon-180.png',
      tag: 'test-notification'
    });
  }

  /**
   * Get notification status
   */
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      subscribed: !!this.subscription,
      isIOS: this.isIOS,
      settings: this.settings
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Initialize on load
if (typeof window !== 'undefined') {
  window.NotificationService = notificationService;
  notificationService.initialize();
}

export default NotificationService;