import request from 'supertest';
import { app } from '../index';
import { prisma } from './setup';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

describe('Notifications API', () => {
  let recipientToken: string;
  let recipientId: string;

  // Creates `count` replies from another user to the recipient's comment,
  // each with an unread notification.
  const createReplyNotifications = async (count: number) => {
    const chapter = await prisma.chapter.create({
      data: { sequence: 1, book: 'Test Book', chapterNumber: 1, content: '1 Test verse' }
    });
    const replier = await prisma.user.create({
      data: { username: 'replier', passwordHash: 'hash' }
    });
    const parent = await prisma.comment.create({
      data: { content: 'Parent', userId: recipientId, chapterId: chapter.id }
    });

    for (let i = 0; i < count; i += 1) {
      const reply = await prisma.comment.create({
        data: { content: `Reply ${i}`, userId: replier.id, chapterId: chapter.id, parentId: parent.id }
      });
      await prisma.notification.create({
        data: { userId: recipientId, commentId: reply.id, parentCommentId: parent.id }
      });
    }
  };

  beforeEach(async () => {
    const recipient = await prisma.user.create({
      data: { username: 'recipient', passwordHash: 'hash' }
    });
    recipientId = recipient.id;
    recipientToken = jwt.sign({ userId: recipient.id }, JWT_SECRET, { expiresIn: '7d' });
  });

  describe('GET /api/notifications', () => {
    it('should count all unread notifications, not just the 50 returned', async () => {
      await createReplyNotifications(55);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications).toHaveLength(50);
      expect(response.body.unreadCount).toBe(55);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/notifications', () => {
    it('should decrease unread count when one notification is marked read', async () => {
      await createReplyNotifications(3);
      const [notification] = await prisma.notification.findMany({ where: { userId: recipientId } });

      const markResponse = await request(app)
        .put(`/api/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(markResponse.status).toBe(200);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(response.body.unreadCount).toBe(2);
    });

    it('should mark all notifications as read', async () => {
      await createReplyNotifications(3);

      const markResponse = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(markResponse.status).toBe(200);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(response.body.unreadCount).toBe(0);
    });
  });
});

describe('Version API', () => {
  it('should return the version from package.json', async () => {
    const { version } = require('../../package.json');

    const response = await request(app).get('/api/version');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ version });
  });
});
