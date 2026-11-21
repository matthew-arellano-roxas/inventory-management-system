import { getIO } from '@/config/socket';
import { AnnouncementBody, AnnouncementPayload } from '@/types/announcement.types';
import { prisma } from '@root/lib/prisma';
import { invalidateCache } from '@/middlewares/cache';
import { logger } from '@/config';
import { ROUTE } from '@/enums/product.enums';

const serviceEventName = 'announcement';

export const saveAnnouncement = async (announcement: AnnouncementPayload) => {
  const dateNow = new Date();
  return await prisma.announcement.create({
    data: {
      type: announcement.type,
      title: announcement.title,
      message: announcement.message,
      createdAt: dateNow,
    },
  });
};

export const sendAnnouncement = (title: string, message: string) => {
  const socket = getIO();
  socket.emit(serviceEventName, {
    title,
    message,
  } as AnnouncementBody);
};

export const processAnnouncement = async (payload: AnnouncementPayload) => {
  const announcement = await saveAnnouncement({
    type: payload.type,
    title: payload.title,
    message: payload.message,
  });
  sendAnnouncement(announcement.title, announcement.message);
  invalidateCache(ROUTE.ANNOUNCEMENT);
  logger.info(`[ANNOUNCEMENT] ${announcement.title}: ${announcement.message}`);
  return announcement;
};

export const getAnnouncements = async () => {
  return await prisma.announcement.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
  });
};
