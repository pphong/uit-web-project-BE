const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.port = process.env.WS_PORT || 8080;
  }

  // Initialize WebSocket server
  async initialize(server) {
    try {
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        verifyClient: this.verifyClient.bind(this)
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      
      logger.info(`🔌 WebSocket server started on port ${this.port}`);
      return this.wss;
    } catch (error) {
      logger.error('Error initializing WebSocket server:', error);
      throw error;
    }
  }

  // Verify client connection
  verifyClient(info) {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      // TODO: Verify JWT token here
      // For now, we'll accept all connections with token
      return true;
    } catch (error) {
      logger.error('Error verifying WebSocket client:', error);
      return false;
    }
  }

  // Handle new connection
  handleConnection(ws, req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('userId');

      if (!userId) {
        logger.warn('WebSocket connection rejected: No userId provided');
        ws.close(1008, 'No userId provided');
        return;
      }

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Store user info on connection
      ws.userId = userId;
      ws.isAlive = true;

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle connection close
      ws.on('close', () => {
        this.handleDisconnection(ws, userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
        this.handleDisconnection(ws, userId);
      });

      // Send welcome message
      this.sendToConnection(ws, {
        type: 'connection',
        message: 'Connected to notification service',
        timestamp: new Date().toISOString()
      });

      logger.info(`WebSocket client connected: ${userId}`);
    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Server error');
    }
  }

  // Handle connection close
  handleDisconnection(ws, userId) {
    try {
      if (this.clients.has(userId)) {
        this.clients.get(userId).delete(ws);
        
        // Remove user if no more connections
        if (this.clients.get(userId).size === 0) {
          this.clients.delete(userId);
        }
      }

      logger.info(`WebSocket client disconnected: ${userId}`);
    } catch (error) {
      logger.error('Error handling WebSocket disconnection:', error);
    }
  }

  // Send message to specific user
  sendToUser(userId, message) {
    try {
      if (!this.clients.has(userId)) {
        logger.warn(`No WebSocket connections found for user: ${userId}`);
        return false;
      }

      const userConnections = this.clients.get(userId);
      let sentCount = 0;

      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendToConnection(ws, message);
          sentCount++;
        }
      });

      logger.info(`Sent message to ${sentCount} connections for user: ${userId}`);
      return sentCount > 0;
    } catch (error) {
      logger.error(`Error sending message to user ${userId}:`, error);
      return false;
    }
  }

  // Send message to specific connection
  sendToConnection(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error sending message to connection:', error);
      return false;
    }
  }

  // Send alert notification
  sendAlertNotification(userId, alert, notificationData) {
    try {
      const message = {
        type: 'alert',
        alertId: alert._id.toString(),
        alertName: alert.name,
        alertType: alert.type,
        threshold: alert.threshold,
        actualAmount: notificationData.actualAmount,
        period: notificationData.period,
        labels: notificationData.labels || [],
        timestamp: new Date().toISOString(),
        data: {
          title: this.generateNotificationTitle(alert, notificationData),
          body: this.generateNotificationBody(alert, notificationData),
          priority: alert.metadata?.priority || 'medium',
          sound: true,
          vibrate: true
        }
      };

      return this.sendToUser(userId, message);
    } catch (error) {
      logger.error('Error sending alert notification:', error);
      return false;
    }
  }

  // Generate notification title
  generateNotificationTitle(alert, notificationData) {
    const { actualAmount, period } = notificationData;
    const threshold = alert.threshold;
    const currency = 'VND';

    switch (alert.type) {
      case 'label_limit':
        return '🚨 Chi tiêu vượt ngưỡng';
      case 'expense_limit':
        return '🚨 Chi tiêu vượt ngưỡng';
      case 'no_expense':
        return 'ℹ️ Không có chi tiêu';
      default:
        return '🔔 Thông báo mới';
    }
  }

  // Generate notification body
  generateNotificationBody(alert, notificationData) {
    const { actualAmount, period } = notificationData;
    const threshold = alert.threshold;
    const currency = 'VND';

    switch (alert.type) {
      case 'label_limit':
        return `Bạn đã chi tiêu ${actualAmount.toLocaleString()} ${currency}, vượt ngưỡng ${threshold.toLocaleString()} ${currency}/${period}`;
      case 'expense_limit':
        return `Tổng chi tiêu ${actualAmount.toLocaleString()} ${currency}, vượt ngưỡng ${threshold.toLocaleString()} ${currency}/${period}`;
      case 'no_expense':
        return `Bạn chưa có giao dịch chi tiêu nào trong ${period} này`;
      default:
        return 'Bạn có một thông báo mới từ hệ thống';
    }
  }

  // Send bulk notifications
  sendBulkNotifications(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        const result = this.sendAlertNotification(
          notification.userId,
          notification.alert,
          notification.data
        );
        
        results.push({
          alertId: notification.alert._id,
          userId: notification.userId,
          success: result
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
  sendSystemMessage(userId, message, type = 'info') {
    try {
      const systemMessage = {
        type: 'system',
        messageType: type,
        message: message,
        timestamp: new Date().toISOString()
      };

      return this.sendToUser(userId, systemMessage);
    } catch (error) {
      logger.error('Error sending system message:', error);
      return false;
    }
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    try {
      let sentCount = 0;
      
      this.clients.forEach((userConnections, userId) => {
        userConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            this.sendToConnection(ws, message);
            sentCount++;
          }
        });
      });

      logger.info(`Broadcast message sent to ${sentCount} connections`);
      return sentCount;
    } catch (error) {
      logger.error('Error broadcasting message:', error);
      return 0;
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.clients.size;
  }

  // Get total connections count
  getTotalConnectionsCount() {
    let total = 0;
    this.clients.forEach(userConnections => {
      total += userConnections.size;
    });
    return total;
  }

  // Get user connections
  getUserConnections(userId) {
    return this.clients.get(userId) || new Set();
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.clients.has(userId) && this.clients.get(userId).size > 0;
  }

  // Clean up dead connections
  cleanupDeadConnections() {
    try {
      this.clients.forEach((userConnections, userId) => {
        userConnections.forEach(ws => {
          if (!ws.isAlive) {
            logger.info(`Cleaning up dead connection for user: ${userId}`);
            ws.terminate();
            userConnections.delete(ws);
          }
        });

        // Remove user if no more connections
        if (userConnections.size === 0) {
          this.clients.delete(userId);
        }
      });
    } catch (error) {
      logger.error('Error cleaning up dead connections:', error);
    }
  }

  // Start ping interval
  startPingInterval() {
    setInterval(() => {
      this.clients.forEach((userConnections, userId) => {
        userConnections.forEach(ws => {
          if (ws.isAlive === false) {
            ws.terminate();
            userConnections.delete(ws);
            return;
          }
          
          ws.isAlive = false;
          ws.ping();
        });
      });
    }, 30000); // Ping every 30 seconds
  }

  // Close WebSocket server
  async close() {
    try {
      if (this.wss) {
        this.wss.close();
        logger.info('WebSocket server closed');
      }
    } catch (error) {
      logger.error('Error closing WebSocket server:', error);
    }
  }
}

module.exports = new WebSocketService();
