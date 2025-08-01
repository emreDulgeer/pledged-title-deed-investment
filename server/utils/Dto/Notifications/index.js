// server/utils/dto/Notifications/index.js

const NotificationDto = require("./NotificationDto");
const NotificationListDto = require("./NotificationListDto");

module.exports = {
  toNotificationDto: (notification) => new NotificationDto(notification),
  toNotificationListDto: (notification) =>
    new NotificationListDto(notification),

  toNotificationListDtoArray: (notifications) =>
    notifications.map((n) => new NotificationListDto(n)),

  NotificationDto,
  NotificationListDto,
};
