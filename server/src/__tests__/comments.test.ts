import request from 'supertest';
import { app } from '../index';
import { prisma } from './setup';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

describe('Comments API', () => {
  let user1: { id: string; email: string; token: string };
  let user2: { id: string; email: string; token: string };
  let chapter: { id: string };

  beforeEach(async () => {
    // Create test users
    const passwordHash1 = await bcrypt.hash('password1', 10);
    const passwordHash2 = await bcrypt.hash('password2', 10);

    const createdUser1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        passwordHash: passwordHash1,
        progress: { create: {} }
      }
    });

    const createdUser2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        passwordHash: passwordHash2,
        progress: { create: {} }
      }
    });

    user1 = {
      id: createdUser1.id,
      email: createdUser1.email,
      token: jwt.sign({ userId: createdUser1.id }, JWT_SECRET, { expiresIn: '7d' })
    };

    user2 = {
      id: createdUser2.id,
      email: createdUser2.email,
      token: jwt.sign({ userId: createdUser2.id }, JWT_SECRET, { expiresIn: '7d' })
    };

    // Create a test chapter
    const createdChapter = await prisma.chapter.create({
      data: {
        sequence: 1,
        book: 'Test Book',
        chapterNumber: 1,
        content: 'Test chapter content'
      }
    });

    chapter = { id: createdChapter.id };
  });

  describe('POST /api/chapters/:chapterId/comments', () => {
    it('should create a new comment', async () => {
      const response = await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'This is a test comment' })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('This is a test comment');
      expect(response.body.user.email).toBe(user1.email);
      expect(response.body.parentId).toBeNull();

      // Verify comment was saved in database
      const comment = await prisma.comment.findUnique({
        where: { id: response.body.id }
      });
      expect(comment).toBeTruthy();
      expect(comment?.content).toBe('This is a test comment');
    });

    it('should reject comment without content', async () => {
      await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: '' })
        .expect(400);

      await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({})
        .expect(400);
    });

    it('should reject comment without authentication', async () => {
      await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .send({ content: 'Test comment' })
        .expect(401);
    });

    it('should reject comment for non-existent chapter', async () => {
      await request(app)
        .post('/api/chapters/nonexistent/comments')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Test comment' })
        .expect(404);
    });

    it('should create a reply to a comment', async () => {
      // Create parent comment
      const parentComment = await prisma.comment.create({
        data: {
          content: 'Parent comment',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      const response = await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ content: 'This is a reply', parentId: parentComment.id })
        .expect(200);

      expect(response.body.content).toBe('This is a reply');
      expect(response.body.parentId).toBe(parentComment.id);
      expect(response.body.user.email).toBe(user2.email);
    });

    it('should reject reply to non-existent parent', async () => {
      await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Reply', parentId: 'nonexistent' })
        .expect(404);
    });

    it('should reject reply to parent from different chapter', async () => {
      // Create another chapter
      const otherChapter = await prisma.chapter.create({
        data: {
          sequence: 2,
          book: 'Other Book',
          chapterNumber: 1,
          content: 'Other content'
        }
      });

      // Create parent comment in other chapter
      const parentComment = await prisma.comment.create({
        data: {
          content: 'Parent in other chapter',
          userId: user1.id,
          chapterId: otherChapter.id
        }
      });

      await request(app)
        .post(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ content: 'Reply', parentId: parentComment.id })
        .expect(400);
    });
  });

  describe('GET /api/chapters/:chapterId/comments', () => {
    it('should return empty array when no comments exist', async () => {
      const response = await request(app)
        .get(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(response.body.comments).toEqual([]);
    });

    it('should return all comments for a chapter', async () => {
      // Create multiple comments
      const comment1 = await prisma.comment.create({
        data: {
          content: 'First comment',
          userId: user1.id,
          chapterId: chapter.id
        },
        include: { user: { select: { id: true, email: true } } }
      });

      const comment2 = await prisma.comment.create({
        data: {
          content: 'Second comment',
          userId: user2.id,
          chapterId: chapter.id
        },
        include: { user: { select: { id: true, email: true } } }
      });

      const response = await request(app)
        .get(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(response.body.comments).toHaveLength(2);
      expect(response.body.comments[0].content).toBe('First comment');
      expect(response.body.comments[1].content).toBe('Second comment');
    });

    it('should return nested comments structure', async () => {
      // Create parent comment
      const parent = await prisma.comment.create({
        data: {
          content: 'Parent comment',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      // Create replies
      const reply1 = await prisma.comment.create({
        data: {
          content: 'Reply 1',
          userId: user2.id,
          chapterId: chapter.id,
          parentId: parent.id
        }
      });

      const reply2 = await prisma.comment.create({
        data: {
          content: 'Reply 2',
          userId: user1.id,
          chapterId: chapter.id,
          parentId: parent.id
        }
      });

      const response = await request(app)
        .get(`/api/chapters/${chapter.id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].content).toBe('Parent comment');
      expect(response.body.comments[0].replies).toHaveLength(2);
      expect(response.body.comments[0].replies[0].content).toBe('Reply 1');
      expect(response.body.comments[0].replies[1].content).toBe('Reply 2');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get(`/api/chapters/${chapter.id}/comments`)
        .expect(401);
    });

    it('should reject request for non-existent chapter', async () => {
      await request(app)
        .get('/api/chapters/nonexistent/comments')
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(404);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'Comment to delete',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      // Verify comment was deleted
      const deleted = await prisma.comment.findUnique({
        where: { id: comment.id }
      });
      expect(deleted).toBeNull();
    });

    it('should not allow deleting other user\'s comment', async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'Other user\'s comment',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(403);

      // Verify comment still exists
      const stillExists = await prisma.comment.findUnique({
        where: { id: comment.id }
      });
      expect(stillExists).toBeTruthy();
    });

    it('should reject deletion without authentication', async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'Comment',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .expect(401);
    });

    it('should reject deletion of non-existent comment', async () => {
      await request(app)
        .delete('/api/comments/nonexistent')
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(404);
    });

    it('should cascade delete replies when parent is deleted', async () => {
      const parent = await prisma.comment.create({
        data: {
          content: 'Parent',
          userId: user1.id,
          chapterId: chapter.id
        }
      });

      const reply = await prisma.comment.create({
        data: {
          content: 'Reply',
          userId: user2.id,
          chapterId: chapter.id,
          parentId: parent.id
        }
      });

      // Delete parent
      await request(app)
        .delete(`/api/comments/${parent.id}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      // Verify both are deleted (cascade)
      const deletedParent = await prisma.comment.findUnique({
        where: { id: parent.id }
      });
      const deletedReply = await prisma.comment.findUnique({
        where: { id: reply.id }
      });
      expect(deletedParent).toBeNull();
      expect(deletedReply).toBeNull();
    });
  });
});
