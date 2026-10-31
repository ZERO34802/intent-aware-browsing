# Intent-Aware Browsing

A Chrome extension that keeps your YouTube sessions on the goal you set. You start a session with an intent ("learn Kubernetes networking"), and the extension uses Gemini vision to check whether each page you open still fits it.

## Features

- **Start a session with an intent** from the extension popup.
- **Fewer distractions:** blurs the YouTube home feed and sidebar recommendations.
- **Alignment checks:** on every URL change the extension captures a screenshot, and the backend asks Gemini whether the page matches your intent. Results are cached so the same page isn't checked twice.
- **Get back on track:** jump back to the last video that matched your intent.
- **Notes and transcripts:** save notes per video during a session.
- **Session recap:** when a session ends, get a summary, plus a short quiz if the intent was educational.

## Architecture

```
Chrome extension (Manifest V3)          Spring Boot backend (Java 21)            Gemini API
popup / content script / service  --->  REST controllers -> services ->  --->  multimodal check
worker: screenshots, blur, UI           JPA repositories -> PostgreSQL          (image + intent)
```

- **Extension** (`front-end/`): vanilla JS, Manifest V3, content script and service worker.
- **Backend** (`back-end/backend/`): Spring Boot 3, Spring Data JPA, PostgreSQL. Layered into controllers, DTOs, services and repositories.
- **AI:** Gemini `generateContent` with inline PNG screenshots, through `GeminiService`.

### API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/sessions/start` | Start a session with an intent |
| POST | `/api/alignment/check` | Check a page screenshot against the intent (cached) |
| GET | `/api/sessions/{id}/last-aligned-video` | Last video that matched the intent |
| POST | `/api/sessions/video-notes` | Save notes and transcript for a video |
| GET | `/api/sessions/{id}/summary` | Session summary and quiz |

## Run it locally

**Backend** (Java 21, Maven, PostgreSQL):

```bash
cd back-end/backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# set your Postgres password, and either set GEMINI_API_KEY or fill gemini.api.key
./mvnw spring-boot:run      # serves on http://localhost:8096
```

Create a database named `productivity_extension` first; Hibernate creates the tables.

**Extension:** open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and select the `front-end/` folder.

## Team

Built by [Karthik Panicker](https://github.com/ZERO34802) (backend, Gemini integration, content script and most features) and Ananya Jha (popup UI).
