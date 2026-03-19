# WisFlow / 微声流

A Windows 11 voice input assistant built with React + Electron. Speak naturally, and it types for you.

> **Wis** = Whisper (AI speech recognition) + **Flow** (seamless input flow)  
> **微声流** = 细微的声音，流畅地流动

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Tray   │  │ Shortcut │  │ System   │  │ Keyboard │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │ IPC
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process (React)                   │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   Voice     │───→│    Agent    │───→│   Action    │    │
│   │    Layer    │    │    Layer    │    │    Layer    │    │
│   │             │    │             │    │             │    │
│   │ • Capture   │    │ • Intent    │    │ • Paste     │    │
│   │ • STT       │    │ • LLM       │    │ • Keys      │    │
│   │ • VAD       │    │ • Decision  │    │ • System    │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Three-Layer Design

### 1. Voice Layer
Handles audio capture and speech-to-text conversion.

**Responsibilities:**
- Start/stop recording via global shortcut
- Voice Activity Detection (VAD) - auto-stop on silence
- Audio format conversion
- STT API calls (Whisper / Azure / Xunfei)

**Key Components:**
- `VoicePanel` - Visual recording interface
- `useAudioRecorder` - Recording logic hook
- `sttService` - Speech-to-text service

### 2. Agent Layer
The brain. Decides what to do with the transcribed text.

**Responsibilities:**
- Parse user intent
- Route to appropriate handler
- Call LLM when needed
- Manage conversation context

**Intent Types:**
| Intent | Action | Example |
|--------|--------|---------|
| `DIRECT_PASTE` | Paste text as-is | "Type: Hello world" |
| `LLM_PROCESS` | Send to LLM, then paste | "Write a thank you email to my boss" |
| `COMMAND` | Execute system command | "Open Chrome" / "Search for React docs" |

**Key Components:**
- `AgentCore` - Central decision engine
- `intentEngine` - Rule-based + LLM intent detection
- `useLLM` - LLM service integration

### 3. Action Layer (The Paster)
Executes the final action on the system.

**Responsibilities:**
- Simulate keyboard input
- Paste to cursor position
- Execute system commands
- Provide execution feedback

**Key Components:**
- `usePaster` - Text pasting hook
- `nativeBridge` - IPC to main process
- `ActionFeedback` - Visual feedback UI

## Data Flow

```
User presses hotkey (e.g., Ctrl+Shift+V)
         │
         ▼
┌─────────────────┐
│  Voice Layer    │ ──→ Show recording UI, capture audio
│                 │ ──→ Auto-stop on silence
└────────┬────────┘
         │ audioBlob
         ▼
┌─────────────────┐
│  Agent Layer    │ ──→ STT: Convert audio to text
│                 │ ──→ Intent: Decide what to do
│                 │ ──→ LLM: Process if needed
└────────┬────────┘
         │ intent + payload
         ▼
┌─────────────────┐
│  Action Layer   │ ──→ Paste text at cursor
│                 │ ──→ Or execute command
└─────────────────┘
         │
         ▼
   Text appears in active window
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron |
| Frontend | React + TypeScript |
| State Management | Zustand |
| Styling | Tailwind CSS |
| STT | Whisper (local) / Azure Speech |
| LLM | OpenAI API / Claude / Ollama (local) |
| Input Simulation | @nut-tree/nut-js |

## Project Structure

```
wisflow/
├── electron/               # Main process
│   ├── main.ts
│   ├── preload.ts         # IPC bridge
│   └── modules/
│       ├── audioCapture.ts
│       ├── globalShortcut.ts
│       ├── systemTray.ts
│       └── nativePaster.ts
│
├── src/
│   ├── features/
│   │   ├── voice/         # Voice Layer
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   │
│   │   ├── agent/         # Agent Layer
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   │
│   │   └── action/        # Action Layer
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/
│   │
│   ├── store/             # Global state
│   ├── shared/            # Shared utilities
│   └── App.tsx
│
└── package.json
```

## Name Origin

| Name | Meaning |
|------|---------|
| **WisFlow** | **Wis** (Whisper AI + Wisdom) + **Flow** (effortless input flow) |
| **微声流** | 细微的声音如流水般自然输入，微言大义，声入心流 |

The name captures two essences:
1. **Technology** — Built on OpenAI Whisper for speech recognition
2. **Experience** — Voice flows into text as naturally as water

## Key Features

1. **Global Hotkey** - Trigger from anywhere with custom shortcut
2. **Floating UI** - Compact overlay when recording
3. **Auto-paste** - Text goes directly to cursor position
4. **LLM Integration** - Ask it to rewrite, translate, or generate text
5. **Privacy Mode** - Local Whisper for offline usage

## Next Steps

1. Initialize project with `npm create electron-vite`
2. Set up IPC bridge between main and renderer
3. Implement voice capture with VAD
4. Build the Agent decision engine
5. Add native keyboard simulation

---

Built for Windows 11 | React + Electron
