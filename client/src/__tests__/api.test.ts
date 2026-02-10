import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComment, fetchComments, deleteComment } from '../api';

// Mock fetch globally
global.fetch = vi.fn();

describe('Comment API Functions', () => {
  const mockToken = 'test-token';
  const mockChapterId = 'chapter-123';
  const mockCommentId = 'comment-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const mockComment = {
        id: mockCommentId,
        content: 'Test comment',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-123',
          email: 'test@example.com'
        },
        parentId: null,
        replies: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockComment)
      });

      const result = await createComment(mockChapterId, 'Test comment', mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/chapters/${mockChapterId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`
          },
          body: JSON.stringify({ content: 'Test comment', parentId: undefined })
        }
      );

      expect(result).toEqual(mockComment);
    });

    it('should create a reply with parentId', async () => {
      const mockReply = {
        id: 'reply-123',
        content: 'Test reply',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-123',
          email: 'test@example.com'
        },
        parentId: 'parent-123',
        replies: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockReply)
      });

      const result = await createComment(mockChapterId, 'Test reply', mockToken, 'parent-123');

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/chapters/${mockChapterId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`
          },
          body: JSON.stringify({ content: 'Test reply', parentId: 'parent-123' })
        }
      );

      expect(result).toEqual(mockReply);
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Bad request' })
      });

      await expect(
        createComment(mockChapterId, 'Test comment', mockToken)
      ).rejects.toThrow('Bad request');
    });
  });

  describe('fetchComments', () => {
    it('should fetch comments successfully', async () => {
      const mockComments = {
        comments: [
          {
            id: 'comment-1',
            content: 'Comment 1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            user: {
              id: 'user-1',
              email: 'user1@example.com'
            },
            parentId: null,
            replies: []
          },
          {
            id: 'comment-2',
            content: 'Comment 2',
            createdAt: '2024-01-01T01:00:00Z',
            updatedAt: '2024-01-01T01:00:00Z',
            user: {
              id: 'user-2',
              email: 'user2@example.com'
            },
            parentId: null,
            replies: []
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockComments)
      });

      const result = await fetchComments(mockChapterId, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/chapters/${mockChapterId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${mockToken}`
          }
        }
      );

      expect(result).toEqual(mockComments);
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Chapter not found' })
      });

      await expect(
        fetchComments(mockChapterId, mockToken)
      ).rejects.toThrow('Chapter not found');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true })
      });

      const result = await deleteComment(mockCommentId, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/comments/${mockCommentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockToken}`
          }
        }
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: 'Forbidden' })
      });

      await expect(
        deleteComment(mockCommentId, mockToken)
      ).rejects.toThrow('Forbidden');
    });
  });
});
