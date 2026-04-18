# FanZone AI — Indian Cricket Fan Connection Platform

> **1st Innings Challenge** | Google ADK Hackathon — Gen AI Academy APAC Edition

A multi-agent AI platform that enables Indian cricket fans to form meaningful connections around shared team loyalties and live match experiences — powered by **Gemini 2.5 Flash**, **Google ADK**, **real-time CricAPI data**, and **Cloud Firestore**.

**Live:** Deployed on Google Cloud Run

---

## Architecture

```mermaid
graph TB
    subgraph Frontend["🌐 Web Frontend"]
        UI["Dark/Light Theme UI<br/>HTML + CSS + JS"]
    end

    subgraph API["⚡ FastAPI Backend"]
        REST["22 REST Endpoints<br/>/api/*"]
        GEMINI["Gemini 2.5 Flash<br/>Direct AI Chat"]
        ADK["ADK Agent Runner<br/>Multi-Agent Pipeline"]
    end

    subgraph Agents["🤖 ADK Multi-Agent System"]
        CMD["🎯 Commander Agent<br/>Intent Router"]
        MA["🏏 Match Agent<br/>9 Tools"]
        FA["👥 Fan Agent<br/>4 Tools"]
        DA["💬 Discussion Agent<br/>4 Tools"]
        CA["🤝 Connection Agent<br/>2 Tools"]
    end

    subgraph Data["💾 Data Layer"]
        CRIC["CricAPI<br/>Real-time Cricket Data"]
        FS["Cloud Firestore<br/>Persistent Storage"]
        TEAMS["teams.json<br/>10 IPL Teams"]
    end

    UI --> REST
    UI --> ADK
    REST --> GEMINI
    ADK --> CMD
    CMD --> MA
    CMD --> FA
    CMD --> DA
    CMD --> CA
    MA --> CRIC
    MA --> TEAMS
    FA --> FS
    DA --> FS
    CA --> FS

    style Frontend fill:#4285F4,stroke:#3367D6,color:#fff
    style API fill:#EA4335,stroke:#C5221F,color:#fff
    style Agents fill:#FBBC04,stroke:#F9AB00,color:#000
    style Data fill:#34A853,stroke:#1E8E3E,color:#fff
    style CMD fill:#F9AB00,stroke:#E8A000,color:#000
    style MA fill:#FDD663,stroke:#F9AB00,color:#000
    style FA fill:#FDD663,stroke:#F9AB00,color:#000
    style DA fill:#FDD663,stroke:#F9AB00,color:#000
    style CA fill:#FDD663,stroke:#F9AB00,color:#000
```

---

## How It Works

1. Fan opens the web UI → sees live IPL & India cricket scores (real-time from CricAPI)
2. Fan registers with team loyalty → profile stored in Cloud Firestore
3. Fan chats with **Gemini AI** → Commander Agent routes to the right sub-agent
4. **Match Agent** fetches live scores, match details, player stats from CricAPI
5. **Discussion Agent** creates match threads, replies, reactions in Firestore
6. **Connection Agent** links fans who bond over shared match moments
7. All data is **persistent** — every user sees shared fan profiles, discussions, connections

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| AI Model | Gemini 2.5 Flash (Vertex AI) | Reasoning, fan matching, analysis |
| Agent Framework | Google ADK | Multi-agent orchestration with 19 FunctionTools |
| Cricket Data | CricAPI (cricketdata.org) | Real-time live scores, match details, player stats |
| Database | Cloud Firestore | Persistent fan profiles, discussions, connections |
| Backend | FastAPI | 22 REST API endpoints |
| Frontend | Vanilla HTML/CSS/JS | Dark/light theme, Google color scheme |
| Deployment | Cloud Run | Serverless container hosting |
| Auth | Vertex AI ADC | Application Default Credentials |

---

## Real-Time Cricket Data

All match data comes from **live CricAPI endpoints** — India & IPL matches only:

| CricAPI Endpoint | Data |
|-----------------|------|
| `/v1/currentMatches` | Live + recently completed matches |
| `/v1/cricScore` | Real-time live scores |
| `/v1/match_info` | Full match details & scorecard |
| `/v1/series` | Series search (IPL, World Cup) |
| `/v1/series_info` | Full series with all matches |
| `/v1/players_info` | Player profiles & stats |

Built-in TTL caching (60s live / 5min lists / 1hr static) to stay within 100 requests/day free tier.

---

## Multi-Agent System — 19 Tools

```mermaid
graph LR
    subgraph Commander["Commander Agent"]
        C["Routes by intent"]
    end

    subgraph Match["Match Agent — 9 Tools"]
        M1["get_live_matches"]
        M2["get_live_cricket_scores"]
        M3["get_match_details"]
        M4["get_recent_matches"]
        M5["get_ipl_matches"]
        M6["search_cricket_series"]
        M7["get_team_info"]
        M8["get_player_details"]
        M9["get_matches_for_team"]
    end

    subgraph Fan["Fan Agent — 4 Tools"]
        F1["register_fan"]
        F2["view_fan_profile"]
        F3["find_team_fans"]
        F4["discover_similar_fans"]
    end

    subgraph Disc["Discussion Agent — 4 Tools"]
        D1["start_discussion"]
        D2["get_match_discussions"]
        D3["reply_to_discussion"]
        D4["react_to_discussion"]
    end

    subgraph Conn["Connection Agent — 2 Tools"]
        X1["connect_fans"]
        X2["view_connections"]
    end

    C --> Match
    C --> Fan
    C --> Disc
    C --> Conn

    style Commander fill:#4285F4,stroke:#3367D6,color:#fff
    style Match fill:#EA4335,stroke:#C5221F,color:#fff
    style Fan fill:#34A853,stroke:#1E8E3E,color:#fff
    style Disc fill:#FBBC04,stroke:#F9AB00,color:#000
    style Conn fill:#7B1FA2,stroke:#6A1B9A,color:#fff
```

---

## API Endpoints (22 total)

### Cricket Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/live-scores` | Live scores — IPL & India matches |
| GET | `/api/current-matches` | Currently running matches |
| GET | `/api/recent-matches` | Recent completed matches |
| GET | `/api/match/{id}` | Match details by ID |
| GET | `/api/ipl` | Current IPL season data |
| GET | `/api/series/search?q=` | Search cricket series |
| GET | `/api/team/{code}` | IPL team info (10 teams) |
| GET | `/api/player/search?q=` | Player search |

### Fan Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fan/register` | Register fan profile |
| GET | `/api/fan/{user_id}` | View fan profile |
| GET | `/api/fans/team/{code}` | Fans by team |
| GET | `/api/fan/{user_id}/similar` | AI-powered fan matching |

### Discussions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/discussion/create` | Start a match discussion |
| GET | `/api/discussion/match/{id}` | Discussions for a match |
| POST | `/api/discussion/{id}/reply` | Reply to discussion |
| POST | `/api/discussion/{id}/react` | React with emoji |
| GET | `/api/discussion/suggest/{id}` | AI discussion suggestions |

### Connections & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connection/create` | Connect two fans |
| GET | `/api/connection/{user_id}` | View fan connections |
| POST | `/api/chat` | Gemini AI direct chat |
| POST | `/api/agent-chat` | ADK multi-agent chat |
| GET | `/api/match/{id}/analysis` | AI match analysis |

---

## Project Structure

```
fan_zone/
├── main.py                          # FastAPI entry point + static serving
├── gemini_ai.py                     # Direct Gemini 2.5 Flash integration
├── agent_runner.py                  # ADK Runner (Commander → sub-agents)
├── agents/
│   ├── commander.py                 # Commander agent (intent router)
│   ├── match_agent.py               # Match data agent (9 CricAPI tools)
│   ├── fan_agent.py                 # Fan profile agent (4 Firestore tools)
│   ├── discussion_agent.py          # Discussion agent (4 Firestore tools)
│   └── connection_agent.py          # Connection agent (2 Firestore tools)
├── mcp_server/
│   ├── match_tools.py               # 9 match FunctionTools
│   ├── fan_tools.py                 # 4 fan FunctionTools
│   ├── discussion_tools.py          # 4 discussion FunctionTools
│   └── connection_tools.py          # 2 connection FunctionTools
├── cricket_api/
│   └── client.py                    # CricAPI HTTP client + caching + India filter
├── api/
│   └── routes.py                    # 22 REST API endpoints
├── db/
│   └── firestore.py                 # Cloud Firestore CRUD operations
├── data/
│   └── teams.json                   # 10 IPL teams (curated fan data)
├── static/
│   ├── index.html                   # Web UI
│   ├── styles.css                   # Dark/light theme + Google colors
│   └── app.js                       # Frontend logic
├── Dockerfile                       # Cloud Run container (python:3.11-slim)
├── requirements.txt                 # 8 Python dependencies
└── .gitignore
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Google Cloud project with Vertex AI and Firestore enabled
- CricAPI key (free: https://cricketdata.org/signup.aspx)

### Local Development

```bash
git clone https://github.com/jkaliraj/fan_zone.git
cd fan_zone
pip install -r requirements.txt

export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_LOCATION=us-central1
export CRICKET_API_KEY=your-cricapi-key

python -m uvicorn main:app --host 0.0.0.0 --port 8080
# Open http://localhost:8080
```

### Deploy to Cloud Run

```bash
# Enable APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  --project=your-project-id

# Create Firestore database
gcloud firestore databases create --project=your-project-id --location=us-central1

# Deploy
gcloud run deploy fanzone-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=your-project-id,GOOGLE_CLOUD_LOCATION=us-central1,CRICKET_API_KEY=your-key" \
  --memory 512Mi \
  --timeout 60
```

---

## Features

- **Real-time IPL & India cricket scores** from CricAPI with auto-caching
- **Gemini AI chat** — ask about matches, players, teams in natural language
- **Multi-agent system** — 5 specialized agents with 19 tools via Google ADK
- **Fan registration** — create profile with team loyalty, bio, location
- **Match discussions** — threaded conversations with replies and emoji reactions
- **Fan connections** — connect with other fans over shared match moments
- **Dark/Light mode** — toggle with Google brand color scheme
- **India-only filtering** — all data filtered to IPL and India cricket
- **Persistent storage** — Cloud Firestore for all user data
- **10 IPL teams** — curated team data with rivalries and fun facts

---

Built with **Google Gemini**, **Google ADK**, **Cloud Firestore**, **Cloud Run**, and **CricAPI** for the 1st Innings Challenge — Gen AI Academy APAC Edition.
