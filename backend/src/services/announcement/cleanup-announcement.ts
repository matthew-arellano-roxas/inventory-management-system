import { AnnouncementType } from '@root/generated/prisma/enums';
import { saveAnnouncement, sendAnnouncement } from '@/services/announcement/announcement.service';
import { invalidateCache } from '@/middlewares/cache';
import { ROUTE } from '@/enums/product.enums';
import { logger } from '@/config';

export enum ResourceAnnouncementTitle {
  RESOURCE_CLEANUP = 'Resource Cleanup',
}

const announcementType: AnnouncementType = AnnouncementType.RESOURCE;
const announcementTitle: ResourceAnnouncementTitle = ResourceAnnouncementTitle.RESOURCE_CLEANUP;

export const createResourceCleanAnnouncement = async () => {
  const announcement = await saveAnnouncement({
    type: announcementType,
    title: announcementTitle,
    message: 'Resources have been cleaned up.',
  });
  sendAnnouncement(announcement.title, announcement.message);
  invalidateCache(ROUTE.ANNOUNCEMENT);
  logger.info(`[RESOURCE CLEANUP] ${announcement.title}: ${announcement.message}`);
  return announcement;
};
