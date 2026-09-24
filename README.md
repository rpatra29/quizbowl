# ThinkFast

ThinkFast is a lightweight, browser-based quiz bowl reader for solo practice and classroom play. Questions are revealed one sentence at a time so players can buzz early for more points.

The app is built with plain HTML, CSS, and JavaScript plus a small dependency-free Node.js server that keeps the AI provider key out of the browser.

## Features

- **Solo mode:** automatically reads each question character by character, lets the player buzz, and checks typed answers with fuzzy matching.
- **Classroom mode:** gives a teacher manual control over sentence reveals, an independent countdown timer, and scoring for up to 12 tables.
- Sentence-based scoring that decreases by 100 points per clue, with a 100-point minimum.
- Adjustable reading speed, answer timer, and text size.
- Light and dark themes.
- A history of questions completed during the current session.
- An AI question-set builder with natural-language revisions and JSON export.

## Run locally

Requires Node.js 18 or newer. Copy `.env.example` to `.env`, add a Groq API key, and start the server:

```bash
cp .env.example .env
npm start
```

Then open [http://localhost:8000](http://localhost:8000) in a browser.

The `.env` file is ignored by Git. Never commit or share it. An internet connection is needed for AI generation, Google Fonts, and the Fuzzball.js CDN dependency. If Fuzzball.js is unavailable, answer checking falls back to an exact, case-insensitive match.

## Generate a question set with AI

Select **AI Set Builder** in the header, then:

1. Describe the students, topic, difficulty, coverage, and any teaching goals.
2. Generate and review the draft.
3. Ask for changes in plain language, such as “make these appropriate for grade 4” or “replace question 6 with one about the Dust Bowl.”
4. Load the set into the current game or download it as JSON.

The browser sends prompts to the local `/api/generate` endpoint. The server reads `GROQ_API_KEY` and `GROQ_MODEL` from `.env` and calls Groq; teachers never see or enter the key. AI-generated material can contain factual errors, so teachers should review every set before using it.

The default model is `openai/gpt-oss-20b`. Change `GROQ_MODEL` in `.env` to use another Groq model that supports strict structured output.

## How to play

### Solo mode

1. Let the clue reveal automatically.
2. Press **Space** or select **Buzz In** when you know the answer.
3. Type an answer within five seconds and press **Enter**.
4. Select **Next Question** or press **J** to continue.

Answers are normalized and compared using a fuzzy-match threshold, so small punctuation, word-order, and wording differences may still be accepted.

### Classroom mode

1. Add the participating table names (up to 12).
2. Select **Next Sentence** or press **J** to reveal a clue.
3. Start and stop the answer timer manually as needed.
4. Click each table that answered correctly to award the displayed points, or choose **Nobody got it**.
5. Press **Space** or select **Reveal Answer** when the question is over.

Multiple tables can receive points for the same question. Scores and question history remain in memory only and reset when the page is refreshed.

## Keyboard shortcuts

| Key | Solo | Classroom |
| --- | --- | --- |
| `Space` | Buzz in | Reveal the answer |
| `J` | Go to the next question | Reveal the next sentence |
| `Enter` | Submit or dismiss a typed answer | Add a table while its name field is focused |

Shortcuts are ignored while typing in an input field.

## Add or edit questions

Questions live in [`initialQuestions.json`](initialQuestions.json). Each entry supports this shape:

```json
{
  "answer": "Franklin D. Roosevelt",
  "label": "This answer is a person",
  "clue": "This American president took office in 1933...",
  "year": "2026",
  "tournament": "Example Tournament",
  "level": "HS",
  "category": "History"
}
```

`answer` and `clue` are required for normal play. `label`, `year`, `tournament`, `level`, and `category` are optional display metadata. Clues are split into sentences using `.`, `!`, and `?`, so punctuation determines each reveal and its point value.

After editing the file, keep it valid JSON and refresh the browser.

## Project structure

```text
.
├── index.html             # Page structure and third-party script imports
├── index.css              # Layout, themes, and responsive styles
├── initialQuestions.json  # Question set
├── server.js              # Static server and private Groq API proxy
├── package.json           # Node version and start command
├── .env.example           # Safe configuration template
└── src/
    └── main.js            # Reading, answers, timers, scoring, and controls
```
