# FacelessFlowAI - Web Dashboard (`mirza-web`)

## ⚡ Overview
This is the frontend dashboard for FacelessFlowAI, built with **Next.js 14**, **TailwindCSS**, and **TypeScript**. It provides the complete studio interface for users to generate scripts, customize scenes, and preview videos in real-time.

---

## 🎥 Remotion Integration
We use **Remotion** in a unique "Hybrid" setup:

### 1. The Player (Client-Side)
Inside we use `@remotion/player` to provide a real-time, playable preview of the video.
*   **Location**: `remotion/` directory contains the visual components (`Scene.tsx`, `MainComposition.tsx`).
*   **WYSIWYG**: The code running in the browser Player is *identical* to the code running on the renderer. This ensures that what the user sees in the dashboard is exactly what gets rendered.
*   **Performance**: The Player renders standard HTML/CSS/Canvas elements. It does **not** encode video in the browser; it just plays the React components.

### 2. Shared Logic
The critical file `remotion/Scene.tsx` is essentially "shared" logic.
*   **Frontend**: Used by the Player to show a lightweight preview.
*   **Backend**: The *renderer service* uses a copy of this logic to actually frame-by-frame render the video using Chrome headless.

---

## 🔗 Backend & Data Flow

### The "Renderer" Service
Actual video encoding (MP4 generation) is CPU-intensive and happens on a separate **Node.js/Express** microservice (`facelessflow-renderer`).

### Communication Flow
1.  **Generation**: User clicks "Export Video".
2.  **Trigger**: Next.js sends an HTTP request to the Renderer API (e.g., `https://hf-space-url.com/render`).
3.  **State Sync (Supabase)**:
    *   The Renderer updates the project status (`rendering`, `done`, `error`) in the Supabase Database.
    *   website listens to **Supabase Realtime** changes to update the UI instantly without polling.
4.  **Delivery**: Once finished, the video URL is saved to Supabase, and the "Download" button appears in this dashboard.

---

## 📦 Key Directory Structure

*   `app/project/[id]/page.tsx`: The main Studio UI. Handles all state (scenes, settings, player).
*   `remotion/`:
    *   `Scene.tsx`: The core visual component. Handles animations (Ken Burns), text overlays, and media placement.
    *   `MainComposition.tsx`: Orchestrates the timeline, stringing scenes together.
*   `actions/`: Server Actions for AI operations.
    *   `generateScene.ts`: Calls Gemini/OpenAI to generate text & prompts.
    *   `regenerateImage.ts`: Calls image generation APIs.

---

## 🎨 Features & Options

### 🎭 Visual Styles
We offer diverse visual engines to match the narrative tone:
*   **Zen Monk**: Minimalist, peaceful, spiritual aesthetics.
*   **Cinematic (Realistic)**: High-fidelity photorealistic imagery.
*   **Stock + AI (Natural)**: Hybrid engine using real 4K stock footage from Pexels, matched to the script context.
*   **Stick Figure**: Simple, fun, engaging minimal animations.
*   **Cartoon / Vector**: Vibrant, flat-style vector art.
*   **Medical / Health**: Clean, anatomical, professional medical visuals.
*   **Pop Art / Retro**: Bold colors, halftone patterns, vintage comic style.

### 🎙️ Audio Services
Powered by advanced TTS models (ElevenLabs/OpenAI):
*   **Man With Deep Voice**: Authoritative, storytelling.
*   **Trustworthy Man**: Calm, reliable, news-style.
*   **Sharp Commentator**: Fast-paced, engaging, energetic.
*   **Soft Spoken Woman**: Gentle, soothing, ASMR-adjacent.
*   **Barbara O'Neill**: Specialized clone for health/wellness niches.

### ⚙️ Customization Options
*   **Camera Movements**: Zoom In, Zoom Out, Pan (Left/Right/Up/Down), Static.
*   **Transitions**: Crossfade, Fade In, White Flash, Camera Flash.
*   **Captions**:
    *   **Fonts**: Helvetica, Serif, Brush, Monospace.
    *   **Animations**: Typewriter, Fade-in, Slide-up, Bounce.
    *   **Position**: Top, Center, Mid-Bottom, Bottom.
*   **Audio Visualization**: Real-time waveforms (Bars, Wave, Round) with custom colors.
