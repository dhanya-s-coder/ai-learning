# AI Learning App

An AI-powered learning workspace that turns PDF documents into summaries, searchable study notes, flashcards, quizzes, and document-aware chat. Upload a PDF, let the app extract its content, and generate revision material directly from the source text.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini_API-4285F4?style=for-the-badge&logo=google&logoColor=white)

## Overview

AI Learning App ek full-stack study assistant hai jo students, developers, researchers, aur exam preparation karne wale learners ke liye banaya gaya hai. Iska goal simple hai: long PDFs ko readable, interactive, aur revision-friendly learning material me convert karna.

Instead of manually reading a full PDF again and again, you can:

- PDF upload kar sakte ho.
- Extracted content read kar sakte ho.
- AI se document ke andar ke questions pooch sakte ho.
- Summary generate kar sakte ho.
- Kisi bhi concept ko explain karwa sakte ho.
- Flashcards generate karke spaced-style revision kar sakte ho.
- MCQ quizzes create karke apni preparation test kar sakte ho.

## Key Features

### Secure Authentication

- User signup and login.
- JWT-based access token authentication.
- Refresh token support.
- Password hashing with `bcryptjs`.
- Forgot password and reset password flow.
- Auth rate limiting for safer login/signup endpoints.

### PDF Upload and Processing

- PDF-only upload support.
- File size limit up to 15 MB.
- Text extraction using PDF tooling.
- PDF preview inside the app.
- Upload history tracking.
- Reprocess option for existing documents.
- OCR fallback save route for scanned pages.

### AI Document Assistant

- Chat with uploaded PDFs.
- Ask quick prompts like main ideas, revision priority, and interview questions.
- Generate summaries from extracted PDF content.
- Explain any concept from the document.
- Source matching support for AI-generated answers and summaries.

### Flashcards

- Generate flashcards from any uploaded document.
- Review cards one by one.
- Mark confidence as hard, medium, easy, or mastered.
- Progress tracking per flashcard set.
- Star important cards.
- Delete flashcard sets when they are no longer needed.

### Quizzes

- Generate MCQ quizzes from PDF content.
- Choose quiz difficulty: Easy, Medium, or Hard.
- Select number of questions.
- Start, answer, complete, and review quizzes.
- Score calculation.
- Retry wrong answers with a separate retry quiz.

### Dashboard

- Total documents count.
- Flashcard set count.
- Quiz count.
- Cards available count.
- Recent activity feed.
- Quick PDF upload.
- Recent documents overview.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite |
| Styling | Custom CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| AI | Google Gemini API via `@google/genai` |
| Auth | JWT, bcryptjs |
| Uploads | Multer |
| Validation | Zod |
| Security | Helmet, CORS, Express Rate Limit |
| PDF Processing | pdfjs-dist |
| OCR Support | tesseract.js |

## Project Structure

```text
ai-learning-app/
|-- public/
|-- src/
|   |-- app/
|   |   `-- App.jsx
|   |-- components/
|   |-- features/
|   |   |-- auth/
|   |   |-- dashboard/
|   |   |-- documents/
|   |   |-- study/
|   |   |-- api.js
|   |   |-- AppShell.jsx
|   |   `-- Pages.jsx
|   |-- shared/
|   |   |-- api/
|   |   |-- constants/
|   |   `-- ui/
|   |-- lib/
|   |-- main.jsx
|   `-- styles.css
|-- server/
|   |-- lib/
|   |   |-- ai.js
|   |   |-- auth.js
|   |   |-- mongo.js
|   |   |-- pdf.js
|   |   `-- sources.js
|   |-- models/
|   |   |-- Activity.js
|   |   |-- Document.js
|   |   |-- FlashcardSet.js
|   |   |-- Quiz.js
|   |   `-- User.js
|   `-- src/
|       |-- middleware/
|       |-- routes/
|       |-- services/
|       |-- validators/
|       `-- app.js
|-- .env.example
|-- package.json
|-- vite.config.js
`-- README.md
```

## Getting Started

### Prerequisites

Make sure these are installed on your system:

- Node.js 18 or higher
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-learning-app.git
cd ai-learning-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ai-learning-app
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
PORT=4000
```

For frontend deployments where the API is hosted separately, you can also set:

```env
VITE_API_BASE_URL=https://your-api-domain.com
```

### 4. Run the Full App

```bash
npm run dev:full
```

Frontend will run on:

```text
http://localhost:5173
```

Backend API will run on:

```text
http://localhost:4000
```

### 5. Check API Health

Open this URL in your browser:

```text
http://localhost:4000/api/health
```

Expected response:

```json
{
  "ok": true,
  "hasGeminiKey": true,
  "mongoReady": true
}
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend dev server |
| `npm run dev:server` | Start the Express backend server |
| `npm run dev:full` | Start frontend and backend together |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production frontend build |
| `npm start` | Start the backend server |

## API Overview

All backend routes are mounted under `/api`.

### Auth Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create a new account |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/forgot-password` | Generate reset token |
| `POST` | `/api/auth/reset-password` | Reset password |

### Document Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/bootstrap` | Load user, documents, and activity |
| `POST` | `/api/documents` | Upload and process PDF |
| `PATCH` | `/api/documents/:id` | Rename document |
| `DELETE` | `/api/documents/:id` | Delete document |
| `POST` | `/api/documents/:id/reprocess` | Reprocess uploaded PDF |
| `POST` | `/api/documents/:id/summary` | Generate summary |
| `POST` | `/api/documents/:id/explain` | Explain a concept |
| `POST` | `/api/documents/:id/chat` | Chat with document |
| `PATCH` | `/api/documents/:id/ocr` | Save OCR text for scanned pages |

### Study Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/documents/:id/flashcards` | Generate flashcards |
| `PATCH` | `/api/flashcard-sets/:id/review` | Review a flashcard |
| `PATCH` | `/api/flashcards/:id/star` | Star or unstar a card |
| `DELETE` | `/api/flashcard-sets/:id` | Delete flashcard set |
| `POST` | `/api/documents/:id/quizzes` | Generate quiz |
| `POST` | `/api/quizzes/:id/start` | Start quiz |
| `PATCH` | `/api/quizzes/:id/answer` | Submit answer |
| `POST` | `/api/quizzes/:id/complete` | Complete quiz |
| `POST` | `/api/quizzes/:id/retry-wrong` | Retry wrong answers |

## How It Works

1. User creates an account or logs in.
2. User uploads a PDF with a title.
3. Backend stores the PDF using Multer.
4. PDF text is extracted and saved in MongoDB.
5. Keywords and topic hints are generated from the content.
6. Gemini generates summaries, explanations, flashcards, quizzes, and chat answers.
7. User studies from generated cards and quizzes.
8. Activity, progress, and results are stored per user.

## Security Notes

- Passwords are hashed before storing.
- JWT access tokens are used for protected routes.
- Refresh tokens are stored for session continuity.
- Auth endpoints use rate limiting.
- Request bodies are validated with Zod.
- Helmet is enabled for safer HTTP headers.
- Uploaded files are limited to PDFs.

## Deployment Notes

### Frontend

Build the frontend:

```bash
npm run build
```

The production output will be created in:

```text
dist/
```

### Backend

The backend can be deployed to platforms like Render, Railway, Fly.io, or a VPS.

Required environment variables:

- `MONGODB_URI`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`

### Important Vite Base Path

Current Vite config uses:

```js
base: "/ai-learning/"
```

This is useful for GitHub Pages under a repository path. If you deploy to a root domain, change it to:

```js
base: "/"
```

## Roadmap Ideas

- Better OCR automation for scanned PDFs.
- Export flashcards as CSV or Anki format.
- Export summaries as PDF or Markdown.
- Add notes and highlights per document.
- Add streaks and daily study goals.
- Add admin dashboard.
- Add email delivery for password reset links.
- Add source citations directly inside AI answers.

## Contributing

Contributions are welcome. You can improve the UI, add new AI study modes, optimize PDF extraction, or enhance the backend API.

Basic contribution flow:

```bash
git checkout -b feature/your-feature-name
npm install
npm run dev:full
npm run build
```

Then open a pull request with a clear description of your changes.

## License

This project is currently private/unlicensed. Add a license file before using it for public or commercial distribution.

## Author

Made for learners who want to convert passive PDFs into active study sessions.

If this project helps you, consider giving it a star on GitHub.
