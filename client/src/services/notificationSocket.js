// src/services/notificationSocket.js

import { tokenManager } from "../api/client";

class NotificationSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * WebSocket bağlantısını başlat
   */
  async connect(userId) {
    if (this.socket) {
      console.log("Socket already connected");
      return;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
    const token = tokenManager.getAccessToken();

    if (!token) {
      console.error("No access token available for socket connection");
      return;
    }

    try {
      // Dynamic import for socket.io-client
      const { default: io } = await import("socket.io-client");

      this.socket = io(socketUrl, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      // Join user room
      this.socket.emit("join", `user_${userId}`);

      // Connection events
      this.socket.on("connect", () => {
        console.log("WebSocket connected");
      });

      this.socket.on("disconnect", (reason) => {
        console.log("WebSocket disconnected:", reason);
      });

      this.socket.on("reconnect", (attemptNumber) => {
        console.log("WebSocket reconnected after", attemptNumber, "attempts");
        // Rejoin user room after reconnect
        this.socket.emit("join", `user_${userId}`);
      });

      this.socket.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to connect socket:", error);
      throw error;
    }
  }

  /**
   * WebSocket bağlantısını kapat
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Socket durumunu kontrol et
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Yeni bildirim event'ini dinle
   */
  onNotification(callback) {
    if (!this.socket) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.on("new_notification", callback);
    this.addListener("new_notification", callback);
  }

  /**
   * Bildirim okundu event'ini dinle
   */
  onNotificationRead(callback) {
    if (!this.socket) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.on("notification_read", callback);
    this.addListener("notification_read", callback);
  }

  /**
   * Tümü okundu event'ini dinle
   */
  onAllNotificationsRead(callback) {
    if (!this.socket) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.on("all_notifications_read", callback);
    this.addListener("all_notifications_read", callback);
  }

  /**
   * Bildirim silindi event'ini dinle
   */
  onNotificationDeleted(callback) {
    if (!this.socket) {
      console.warn("Socket not connected");
      return;
    }

    this.socket.on("notification_deleted", callback);
    this.addListener("notification_deleted", callback);
  }

  /**
   * Event listener'ı kaldır
   */
  removeListener(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Tüm listener'ları kaldır
   */
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }

    this.listeners.delete(event);
  }

  /**
   * Internal: Listener'ı kaydet
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
}

// Singleton instance
const notificationSocket = new NotificationSocket();
export default notificationSocket;
