# Chapter a Day - Client

React frontend for the Chapter a Day application, built with Vite and TypeScript.

## Features

- **Daily Chapter Display**: Shows today's chapter with progress tracking
- **User Authentication**: Login and registration forms
- **Commenting System**: 
  - Comment on chapters
  - Reply to comments (nested structure)
  - Delete own comments
  - View all comments from the community

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will run on `http://localhost:5173` (or the next available port).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

## Project Structure

```
client/
├── src/
│   ├── __tests__/      # Test files
│   ├── pages/          # Page components
│   │   ├── Login.tsx   # Login/Register page
│   │   └── Dashboard.tsx # Main dashboard with chapter and comments
│   ├── api.ts          # API client functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── index.html          # HTML template
```

## API Integration

The client communicates with the backend API at `http://localhost:4000`. All API functions are in `src/api.ts`:

- `registerUser(email, password)` - Register new user
- `loginUser(email, password)` - Login user
- `fetchToday(token)` - Get today's chapter
- `fetchProgress(token)` - Get reading progress
- `createComment(chapterId, content, token, parentId?)` - Create comment or reply
- `fetchComments(chapterId, token)` - Get all comments for a chapter
- `deleteComment(commentId, token)` - Delete own comment

## Testing

Tests are written with Vitest and React Testing Library:

```bash
npm test              # Run all tests
npm run test:ui       # Interactive UI mode
npm run test:coverage # Generate coverage report
```

### Test Coverage
- API function mocking and error handling
- Dashboard component rendering
- Comment creation and display
- Nested reply functionality
- Permission-based UI (delete button visibility)
- User interactions (forms, buttons, etc.)

## Styling

Styles are in `src/App.css` using modern CSS with:
- Clean, minimal design
- Responsive layout
- Nested comment styling with indentation
- Form and button styling
- Error and loading states
