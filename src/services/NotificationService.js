const WebSocketService = require('./WebSocketService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.wsService = WebSocketService;
  }

  // Initialize notification services
  async initialize(server) {
    try {
      // Initialize WebSocket service
      await this.wsService.initialize(server);
      
      // Start ping interval for connection health
      this.wsService.startPingInterval();
      
      // Start cleanup interval for dead connections
      setInterval(() => {
        this.wsService.cleanupDeadConnections();
      }, 60000); // Cleanup every minute
      
      logger.info('Notification services initialized (WebSocket only)');
    } catch (error) {
      logger.error('Error initializing notification services:', error);
      throw error;
    }
  }

  // Send alert notification
  async sendAlertNotification(alert, user, notificationData) {
    try {
      const userId = user._id.toString();
      
      // Check if user is connected
      if (!this.wsService.isUserConnected(userId)) {
        logger.warn(`User ${userId} is not connected to WebSocket, skipping notification`);
        return {
          success: false,
          error: 'User not connected to WebSocket'
        };
      }

      // Send WebSocket notification
      const success = await this.wsService.sendAlertNotification(userId, alert, notificationData);
      
      if (success) {
        logger.info(`Alert notification sent via WebSocket for alert ${alert._id}`, {
          alertId: alert._id,
          alertName: alert.name,
          alertType: alert.type,
          userId: userId
        });

        return {
          success: true,
          notifications: [{
            type: 'websocket',
            status: 'sent'
          }]
        };
      } else {
        logger.error(`Failed to send WebSocket notification for alert ${alert._id}`);
        return {
          success: false,
          error: 'Failed to send WebSocket notification'
        };
      }
    } catch (error) {
      logger.error('Error sending alert notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = await this.sendAlertNotification(
          notification.alert,
          notification.user,
          notification.data
        );
        
        results.push({
          alertId: notification.alert._id,
          userId: notification.user._id,
          success: result.success,
          notifications: result.notifications
        });
      }

      logger.info(`Bulk notifications sent: ${results.length} total`);
      return results;
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Send system message
  async sendSystemMessage(userId, message, type = 'info') {
    try {
      const success = await this.wsService.sendSystemMessage(userId, message, type);
      
      if (success) {
        logger.info(`System message sent to user ${userId}: ${message}`);
      } else {
        logger.warn(`Failed to send system message to user ${userId}: ${message}`);
      }
      
      return success;
    } catch (error) {
      logger.error('Error sending system message:', error);
      return false;
    }
  }

  // Send welcome message to new user
  async sendWelcomeMessage(userId, userName) {
    try {
      const message = `Chào mừng ${userName} đến với hệ thống quản lý chi tiêu!`;
      return await this.sendSystemMessage(userId, message, 'welcome');
    } catch (error) {
      logger.error('Error sending welcome message:', error);
      return false;
    }
  }

  // Send alert created confirmation
  async sendAlertCreatedConfirmation(userId, alertName) {
    try {
      const message = `Alert "${alertName}" đã được tạo thành công!`;
      return await this.sendSystemMessage(userId, message, 'success');
    } catch (error) {
      logger.error('Error sending alert created confirmation:', error);
      return false;
    }
  }

  // Send alert updated confirmation
  async sendAlertUpdatedConfirmation(userId, alertName) {
    try {
      const message = `Alert "${alertName}" đã được cập nhật thành công!`;
      return await this.sendSystemMessage(userId, message, 'success');
    } catch (error) {
      logger.error('Error sending alert updated confirmation:', error);
      return false;
    }
  }

  // Send alert deleted confirmation
  async sendAlertDeletedConfirmation(userId, alertName) {
    try {
      const message = `Alert "${alertName}" đã được xóa thành công!`;
      return await this.sendSystemMessage(userId, message, 'info');
    } catch (error) {
      logger.error('Error sending alert deleted confirmation:', error);
      return false;
    }
  }

  // Send transaction created notification
  async sendTransactionCreatedNotification(userId, transactionData) {
    try {
      const message = {
        type: 'transaction',
        transactionId: transactionData._id,
        amount: transactionData.amount,
        description: transactionData.description,
        currency: transactionData.currency,
        timestamp: new Date().toISOString(),
        data: {
          title: '💰 Giao dịch mới',
          body: `Giao dịch ${transactionData.description} với số tiền ${transactionData.amount.toLocaleString()} ${transactionData.currency}`,
          priority: 'low',
          sound: false,
          vibrate: false
        }
      };

      return await this.wsService.sendToUser(userId, message);
    } catch (error) {
      logger.error('Error sending transaction created notification:', error);
      return false;
    }
  }

  // Send wallet balance low notification
  async sendWalletBalanceLowNotification(userId, walletName, currentBalance, threshold) {
    try {
      const message = {
        type: 'wallet_balance',
        walletName: walletName,
        currentBalance: currentBalance,
        threshold: threshold,
        timestamp: new Date().toISOString(),
        data: {
          title: '⚠️ Số dư ví thấp',
          body: `Số dư ví "${walletName}" còn ${currentBalance.toLocaleString()} VND (ngưỡng: ${threshold.toLocaleString()} VND)`,
          priority: 'high',
          sound: true,
          vibrate: true
        }
      };

      return await this.wsService.sendToUser(userId, message);
    } catch (error) {
      logger.error('Error sending wallet balance low notification:', error);
      return false;
    }
  }

  // Test notification
  async testNotification(user, alertType = 'label_limit') {
    try {
      const testAlert = {
        _id: 'test-alert-id',
        name: 'Test Alert',
        type: alertType,
        threshold: 500000,
        period: 'daily',
        metadata: {
          priority: 'medium'
        }
      };

      const testData = {
        actualAmount: 600000,
        period: 'daily',
        labels: ['test-label-id']
      };

      const result = await this.sendAlertNotification(testAlert, user, testData);
      
      logger.info('Test notification sent', { result });
      return result;
    } catch (error) {
      logger.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Get WebSocket statistics
  getWebSocketStats() {
    try {
      return {
        connectedUsers: this.wsService.getConnectedUsersCount(),
        totalConnections: this.wsService.getTotalConnectionsCount(),
        isRunning: this.wsService.wss !== null
      };
    } catch (error) {
      logger.error('Error getting WebSocket stats:', error);
      return {
        connectedUsers: 0,
        totalConnections: 0,
        isRunning: false
      };
    }
  }

  // Check if user is connected
  isUserConnected(userId) {
    try {
      return this.wsService.isUserConnected(userId);
    } catch (error) {
      logger.error('Error checking user connection:', error);
      return false;
    }
  }

  // Broadcast system maintenance message
  async broadcastMaintenanceMessage(message) {
    try {
      const maintenanceMessage = {
        type: 'maintenance',
        message: message,
        timestamp: new Date().toISOString(),
        data: {
          title: '🔧 Bảo trì hệ thống',
          body: message,
          priority: 'high',
          sound: true,
          vibrate: true
        }
      };

      const sentCount = await this.wsService.broadcast(maintenanceMessage);
      logger.info(`Maintenance message broadcasted to ${sentCount} connections`);
      return sentCount;
    } catch (error) {
      logger.error('Error broadcasting maintenance message:', error);
      return 0;
    }
  }

  // Close notification service
  async close() {
    try {
      await this.wsService.close();
      logger.info('Notification service closed');
    } catch (error) {
      logger.error('Error closing notification service:', error);
    }
  }
}

module.exports = NotificationService;