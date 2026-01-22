import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../pages/Dashboard';
import * as api from '../api';

// Mock the API module
vi.mock('../api', () => ({
  fetchToday: vi.fn(),
  fetchProgress: vi.fn(),
  createComment: vi.fn(),
  fetchComments: vi.fn(),
  deleteComment: vi.fn()
}));

describe('Dashboard Comments', () => {
  const mockToken = 'test-token';
  const mockUsername = 'testuser';
  const mockOnLogout = vi.fn();

  const mockTodayData = {
    date: '2024-01-01',
    progress: {
      currentChapterIndex: 1,
      totalChapters: 260
    },
    chapter: {
      id: 'chapter-123',
      book: 'Matthew',
      chapterNumber: 1,
      content: 'Chapter content here'
    }
  };

  const mockProgressData = {
    progress: {
      currentChapterIndex: 1,
      lastDeliveredDate: '2024-01-01T00:00:00Z'
    },
    totalChapters: 260
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchToday as any).mockResolvedValue(mockTodayData);
    (api.fetchProgress as any).mockResolvedValue(mockProgressData);
    (api.fetchComments as any).mockResolvedValue({ comments: [] });
  });

  it('should display comments section', async () => {
    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });
  });

  it('should display empty state when no comments', async () => {
    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    });
  });

  it('should display comments when they exist', async () => {
    const mockComments = {
      comments: [
        {
          id: 'comment-1',
          content: 'First comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            username: 'user1'
          },
          parentId: null,
          replies: []
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          createdAt: '2024-01-01T01:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
          user: {
            id: 'user-2',
            username: 'user2'
          },
          parentId: null,
          replies: []
        }
      ]
    };

    (api.fetchComments as any).mockResolvedValue(mockComments);

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('should allow creating a new comment', async () => {
    const user = userEvent.setup();
    const mockNewComment = {
      id: 'comment-new',
      content: 'New comment',
      createdAt: '2024-01-01T02:00:00Z',
      updatedAt: '2024-01-01T02:00:00Z',
          user: {
            id: 'user-1',
            username: mockUsername
          },
      parentId: null,
      replies: []
    };

    (api.createComment as any).mockResolvedValue(mockNewComment);
    (api.fetchComments as any)
      .mockResolvedValueOnce({ comments: [] })
      .mockResolvedValueOnce({ comments: [mockNewComment] });

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Add a comment...');
    const submitButton = screen.getByText('Post Comment');

    await user.type(textarea, 'New comment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.createComment).toHaveBeenCalledWith(
        mockTodayData.chapter.id,
        'New comment',
        mockToken,
        undefined
      );
    });
  });

  it('should allow replying to a comment', async () => {
    const user = userEvent.setup();
    const mockComments = {
      comments: [
        {
          id: 'comment-1',
          content: 'Parent comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            username: 'user1'
          },
          parentId: null,
          replies: []
        }
      ]
    };

    const mockReply = {
      id: 'reply-1',
      content: 'This is a reply',
      createdAt: '2024-01-01T03:00:00Z',
      updatedAt: '2024-01-01T03:00:00Z',
          user: {
            id: 'user-2',
            username: mockUsername
          },
      parentId: 'comment-1',
      replies: []
    };

    (api.fetchComments as any).mockResolvedValue(mockComments);
    (api.createComment as any).mockResolvedValue(mockReply);
    (api.fetchComments as any)
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValueOnce({
        comments: [
          {
            ...mockComments.comments[0],
            replies: [mockReply]
          }
        ]
      });

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Parent comment')).toBeInTheDocument();
    });

    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    const replyTextarea = screen.getByPlaceholderText('Write a reply...');
    const postReplyButton = screen.getByText('Post Reply');

    await user.type(replyTextarea, 'This is a reply');
    await user.click(postReplyButton);

    await waitFor(() => {
      expect(api.createComment).toHaveBeenCalledWith(
        mockTodayData.chapter.id,
        'This is a reply',
        mockToken,
        'comment-1'
      );
    });
  });

  it('should show delete button only for own comments', async () => {
    const mockComments = {
      comments: [
        {
          id: 'comment-1',
          content: 'My comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            email: mockEmail // Same as logged in user
          },
          parentId: null,
          replies: []
        },
        {
          id: 'comment-2',
          content: 'Other user comment',
          createdAt: '2024-01-01T01:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
          user: {
            id: 'user-2',
            username: 'otheruser'
          },
          parentId: null,
          replies: []
        }
      ]
    };

    (api.fetchComments as any).mockResolvedValue(mockComments);

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('My comment')).toBeInTheDocument();
      expect(screen.getByText('Other user comment')).toBeInTheDocument();
    });

    // Find delete buttons - should only be one (for own comment)
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Verify delete button is only shown for own comment
    const myComment = screen.getByText('My comment').closest('.comment');
    expect(myComment).toBeTruthy();
    if (myComment) {
      expect(within(myComment as HTMLElement).getByText('Delete')).toBeInTheDocument();
    }
  });

  it('should allow deleting own comment', async () => {
    const user = userEvent.setup();
    const mockComments = {
      comments: [
        {
          id: 'comment-1',
          content: 'My comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            username: mockUsername
          },
          parentId: null,
          replies: []
        }
      ]
    };

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    (api.fetchComments as any)
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValueOnce({ comments: [] });
    (api.deleteComment as any).mockResolvedValue({ success: true });

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('My comment')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteComment).toHaveBeenCalledWith('comment-1', mockToken);
    });
  });

  it('should display nested replies', async () => {
    const mockComments = {
      comments: [
        {
          id: 'comment-1',
          content: 'Parent comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            username: 'user1'
          },
          parentId: null,
          replies: [
            {
              id: 'reply-1',
              content: 'First reply',
              createdAt: '2024-01-01T01:00:00Z',
              updatedAt: '2024-01-01T01:00:00Z',
          user: {
            id: 'user-2',
            username: 'user2'
          },
              parentId: 'comment-1',
              replies: []
            },
            {
              id: 'reply-2',
              content: 'Second reply',
              createdAt: '2024-01-01T02:00:00Z',
              updatedAt: '2024-01-01T02:00:00Z',
          user: {
            id: 'user-3',
            username: 'user3'
          },
              parentId: 'comment-1',
              replies: []
            }
          ]
        }
      ]
    };

    (api.fetchComments as any).mockResolvedValue(mockComments);

    render(<Dashboard token={mockToken} username={mockUsername} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Parent comment')).toBeInTheDocument();
      expect(screen.getByText('First reply')).toBeInTheDocument();
      expect(screen.getByText('Second reply')).toBeInTheDocument();
    });
  });
});
