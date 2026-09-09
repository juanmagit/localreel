# 🎬 LocalReel - Local Network Video Streaming Server

LocalReel is a modern media server platform designed to stream movies and videos stored on your local hard drives to any device within your home network (smartphones, Smart TVs, laptops, tablets, etc.) directly through a web browser.

---

## 🚀 Key Features

- **Integrated NestJS Backend**: Robust API server handling SQLite database operations, disk directory scanning, metadata extraction (`ffprobe`), thumbnail generation, and static frontend file serving.
- **Modern React & TypeScript Frontend (Vite)**: Cinematic dark glassmorphic UI styled with **Tailwind CSS v3**, fully responsive across devices.
- **Dual Streaming Engine (HTTP Range + On-Demand FFmpeg Pipe)**:
  - **Direct Play**: Instant zero-CPU streaming for natively supported web formats (`.mp4` / `.webm` with H.264/AAC) using standard HTTP `206 Partial Content` Range requests.
  - **On-Demand FFmpeg Pipe Transcoding (`pipe:1`)**: Real-time on-the-fly transcoding piped directly to the HTTP response stream for heavy or non-native formats (`.mkv`, `.avi`, AC3 audio, HEVC/H.265 video).
- **Sub-Second Precise Timeline Seeking**: Enforced keyframe GOP interval (`-g 25 -keyint_min 25 -sc_threshold 0`) allowing smooth sub-second seeking and 1-click restart to `0:00`.
- **Intelligent Process Lifecycle Management**: Automatically kills child `ffmpeg` processes (`SIGKILL`) as soon as the client disconnects or closes the player tab, avoiding zombie background processes.
- **SQLite Database**: Lightweight local data persistence for media metadata, watch progress, and library folders.

---

## 🛠️ System Requirements

1. **Node.js** v18+ and **npm** v9+.
2. **FFmpeg** (Recommended for on-demand transcoding functionality):
   - Ubuntu / Debian: `sudo apt update && sudo apt install ffmpeg`
   - macOS: `brew install ffmpeg`

---

## ⚙️ Installation & Setup

### 1. Install Dependencies & Build

```bash
# Install all root, server, and client dependencies
npm run install:all

# Build frontend (Vite TS + Tailwind) and backend (NestJS)
npm run build

# Start production server
npm start
```

### 2. Accessing on Local Network (LAN)

Once started, LocalReel runs on port `3000`:

- **Local Machine**: `http://localhost:3000`
- **LAN Devices (TV / Mobile / Tablet)**: `http://<YOUR-PC-LOCAL-IP>:3000`

---

## 💻 Development Workflow

To work on the frontend with **instant Hot Reloading**:

```bash
# Terminal 1: Run frontend dev server (Vite on http://localhost:5173)
npm run dev:client

# Terminal 2: Run backend NestJS server
npm run dev:server
```

Open `http://localhost:5173` in your browser. Any changes to React components (`.tsx`) or Tailwind styles will update automatically.

---

## 📁 Library Configuration

1. Open the LocalReel web interface in your browser.
2. Click the **Directorios / Directories** button in the header.
3. Enter the absolute path to your hard drive movie folder (e.g., `/home/user/Movies` or `/media/external_hd/Videos`).
4. Click **Añadir / Add**. LocalReel will automatically scan your video files, extract metadata, generate thumbnails, and display them in your library grid.
