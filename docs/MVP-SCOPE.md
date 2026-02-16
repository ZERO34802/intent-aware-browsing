# Intent-Aware Browsing Extension - MVP Scope

**Version:** 1.0  
**Last Updated:** February 15, 2026  
**Status:** Planning Phase

---

## ✅ Tech Stack (Locked In)

- **LLM**: Gemini (free tier, multimodal for screenshots)
- **Database**: PostgreSQL
- **Extension**: Vanilla JavaScript (Manifest V3)
- **Backend**: Spring Boot 3.x + Maven
- **Caching**: Caffeine (in-memory)
- **Deployment**: Local only (both run on localhost)

---

## 🎯 MVP Feature Scope

### **What We're Building:**

#### **1. Platform**
- ✅ **YouTube ONLY** (no other sites for now)
- ❌ No Shorts support yet
- ❌ No other platforms (Reddit, Twitter, etc.)

#### **2. Intent Capture**
- User clicks extension icon → Click **"Start Session"** button
- Popup appears: **"What are you here to do?"**
- User types intent (e.g., "Learn how to cook pasta")
- Session begins!

#### **3. Monitoring Strategy**
- ✅ **URL Change Detection**: When user clicks a new video, capture screenshot + check alignment
- ✅ **Session Duration Prompts**: Gentle check-ins at 30 min and 1 hour
- ❌ **NO continuous monitoring** on the same video (no 2-minute checks)
- ❌ **NO hover preview detection** (too complex for MVP)

#### **4. Alignment Checking**
- Screenshot of current page sent to local backend
- Backend sends to Gemini API with user's intent
- Gemini responds: Aligned, Drifting, or Misaligned
- Result cached per video ID (avoid re-checking same video)

#### **5. User Feedback**
- ✅ **Aligned**: Green checkmark notification (subtle, positive)
- ⚠️ **Drifting/Misaligned**: Orange warning overlay ("You seem distracted from: [intent]")
- ❌ **NO blocking** (no hard stop/full block)
- ❌ **NO statistics dashboard** (skip for MVP)
- ❌ **NO session history** (skip for MVP)

#### **6. User Settings**
- ❌ **NO settings page** for MVP
- Everything hardcoded (can add settings in v2)
- Intent is the only user input

#### **7. Backend Features**
- ✅ Alignment check API endpoint
- ✅ Basic logging
- ✅ Caching with Caffeine
- ❌ **NO user accounts/authentication**
- ❌ **NO analytics dashboard**
- ❌ **NO session history storage** (or minimal logging only)

---

## 🔄 User Flow (Step-by-Step)

### **Starting a Session:**

1. **User opens YouTube**
2. **User clicks extension icon** → Clicks **"Start Session"**
3. **Popup shows**: "What are you here to do?"
4. **User types intent**: "Learn how to cook pasta"
5. **Session active!** ✅

### **While Session is Active:**

#### **URL Changes (Main Check):**
- User clicks a video → URL changes to `/watch?v=...`
- Extension captures screenshot
- Sends to backend: screenshot + intent
- Backend queries Gemini
- Response:
  - ✅ **Aligned**: Show green checkmark (3 seconds)
  - ⚠️ **Misaligned**: Show warning overlay ("You're drifting from: Learn how to cook pasta")
- Cache result for this video ID

#### **Session Duration Prompts:**
- **At 30 minutes**: "Still working on: Learn how to cook pasta?" (Yes/No)
- **At 1 hour**: Same prompt
- If "No" → End session
- If "Yes" → Continue monitoring

#### **End Session:**
- User clicks extension → "End Session" button
- Monitoring stops

---

## 🚫 What We're NOT Building (Save for v2)

- ❌ Hover preview detection
- ❌ YouTube Shorts monitoring
- ❌ Comment section scroll tracking
- ❌ Statistics/analytics dashboard
- ❌ Session history
- ❌ User settings page
- ❌ Hard blocking (full screen block)
- ❌ Multi-platform support (Reddit, Twitter, etc.)
- ❌ User authentication
- ❌ Cloud deployment
- ❌ Picture-in-Picture detection
- ❌ Multiple intent sessions
- ❌ Intent editing mid-session

---

## 📦 Success Criteria

**MVP is successful if:**
- ✅ User can start a session with an intent on YouTube
- ✅ Extension detects when they click new videos
- ✅ Screenshots are captured and sent to backend
- ✅ Backend successfully queries Gemini API
- ✅ User sees aligned/misaligned feedback
- ✅ Session prompts appear at 30 min and 1 hour
- ✅ User can end session

**That's it!** Simple, focused, achievable.

---

## 🗂️ Next Steps

1. ✅ Define tech stack
2. ✅ Define MVP scope
3. ⏳ Create folder structure with proper config files
4. ⏳ Design minimal database schema
5. ⏳ Divide work between team members
6. ⏳ Start building!

---

## 📝 Notes

- Keep it simple - we can always add features later
- Focus on getting one thing working well rather than many things poorly
- Prioritize user experience over feature completeness
- Test frequently with real usage scenarios
