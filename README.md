# FanZone AI — Cricket Fan Connection Platform

> **1st Innings Challenge** | Google ADK Hackathon — Gen AI Academy APAC Edition

A multi-agent AI platform built on **Google Agent Development Kit (ADK)** and **Gemini 2.5 Flash** that enables cricket fans to form meaningful connections around shared team loyalties and live match experiences — powered by **real-time cricket data** from CricAPI.

*"Where every match creates a connection."*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Commander Agent                           │
│  - Routes fan requests to specialized sub-agents            │
│  - Handles multi-intent queries                              │
│  - Personality: passionate cricket fan                        │
├──────────┬───────────┬──────────────┬───────────────────────┤
│  Match   │   Fan     │  Discussion  │    Connection         │
│  Agent   │  Agent    │   Agent      │     Agent             │
│          │           │              │                       │
│ CricAPI  │ Firestore │ Firestore    │ Firestore             │
│ Tools(9) │ Tools(4)  │ Tools(4)     │ Tools(2)              │
└──────────┴───────────┴──────────────┴───────────────────────┘
     ▲                       ▲                    ▲
     │                       │                    │
 Real-time              Fan Profiles          Connections
 CricAPI Data           Discussions           Match-anchored
```

---

## How It Works

1. Fan arrives → Commander Agent welcomes them to FanZone AI
2. Fan asks about live matches → **Match Agent** fetches real-time scores from CricAPI
3. Fan registers with team loyalty → **Fan Agent** creates profile, finds similar fans
4. Fan reacts to a match moment → **Discussion Agent** creates/manages threads
5. Two fans bond over a shared moment → **Connection Agent** creates a match-anchored connection
6. All interactions are enriched by **Gemini 2.5 Flash** reasoning

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Agent Framework | Google ADK | Multi-agent orchestration, routing, tool-calling |
| LLM | Gemini 2.5 Flash via Vertex AI | Reasoning, fan matching, natural language |
| Cricket Data | CricAPI (CricketData.org) | **Real-time** live scores, match details, player stats |
| API | FastAPI | REST endpoints for programmatic access |
| MCP Tools | Custom FunctionTools (19 total) | Match, Fan, Discussion, Connection operations |
| Database | Firestore | Fan profiles, discussions, connections |
| Deployment | Cloud Run | Serverless production hosting |
| Auth | Vertex AI ADC | Application Default Credentials |
| UI | ADK Web | Built-in chat interface for interactive testing |

---

## Real-Time Cricket Data (CricAPI)

All match data comes from **live CricAPI endpoints** — no dummy/static data:

| Endpoint | What It Returns |
|----------|----------------|
| `/v1/currentMatches` | Live + recently completed matches |
| `/v1/cricScore` | Real-time live scores |
| `/v1/match_info` | Full match details & scorecard |
| `/v1/matches` | All matches (paginated) |
| `/v1/series` | Series search (IPL, World Cup, etc.) |
| `/v1/series_info` | Full series with all matches |
| `/v1/players_info` | Player profiles |

**Free tier:** 100 requests/day — built-in caching reduces API calls.

Get your free API key: https://cricketdata.org/signup.aspx

---

## Multi-Agent System

### Commander Agent (Orchestrator)
Routes fan requests to 4 specialized sub-agents based on intent.

### Match Agent — 9 Tools
| Tool | Description |
|------|-------------|
| `get_live_matches` | Live + recently completed matches (CricAPI) |
| `get_live_cricket_scores` | Real-time scores for all running matches |
| `get_match_details` | Full match info by ID |
| `get_recent_matches` | Recent completed matches |
| `get_ipl_matches` | Current IPL season — all matches |
| `search_cricket_series` | Search series (IPL, World Cup, Ashes) |
| `get_team_info` | IPL team fan data (rivalries, fun facts) |
| `get_player_details` | Player profile search |
| `get_matches_for_team` | Matches for a specific team |

### Fan Agent — 4 Tools
| Tool | Description |
|------|-------------|
| `register_fan` | Register with team loyalty, bio, location |
| `view_fan_profile` | View any fan's profile |
| `find_team_fans` | Find fans supporting a team |
| `discover_similar_fans` | AI fan matching by loyalty |

### Discussion Agent — 4 Tools
| Tool | Description |
|------|-------------|
| `start_discussion` | Create match discussion thread |
| `get_match_discussions` | View discussions for a match |
| `reply_to_discussion` | Reply to a thread |
| `react_to_discussion` | React with emoji (🔥 💯 😢 🎉 👏) |

### Connection Agent — 2 Tools
| Tool | Description |
|------|-------------|
| `connect_fans` | Connect two fans over a match |
| `view_connections` | View cricket friend network |

---

## Project Structure

```
fan_zone/
├── main.py                        # FastAPI + ADK web entry point
├── fanzone_app/
│   ├── agent.py                   # ADK web app (root_agent)
│   └── .env                       # Vertex AI config
├── agents/
│   ├── commander.py               # Commander agent (orchestrator)
│   ├── match_agent.py             # Match data agent (CricAPI)
│   ├── fan_agent.py               # Fan profile agent
│   ├── discussion_agent.py        # Discussion thread agent
│   └── connection_agent.py        # Fan connection agent
├── cricket_api/
│   └── client.py                  # CricAPI HTTP client with caching
├── mcp_server/
│   ├── match_tools.py             # 9 match FunctionTools (real-time)
│   ├── fan_tools.py               # 4 fan FunctionTools
│   ├── discussion_tools.py        # 4 discussion FunctionTools
│   ├── connection_tools.py        # 2 connection FunctionTools
│   └── server.py                  # MCP server (aggregates all 19 tools)
├── api/
│   └── routes.py                  # REST API endpoints
├── db/
│   └── firestore.py               # Firestore CRUD (profiles, discussions, connections)
├── data/
│   └── teams.json                 # IPL team fan data (rivalries, fun facts)
├── Dockerfile                     # Cloud Run container
├── cloudbuild.yaml                # Cloud Build config
└── requirements.txt               # Python dependencies
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Google Cloud project with Vertex AI, Firestore, Cloud Run enabled
- `gcloud` CLI authenticated
- CricAPI key (free: https://cricketdata.org/signup.aspx)

### Local Development

```bash
# Clone
git clone https://github.com/jkaliraj/fan_zone.git
cd fan_zone

# Install
pip install -r requirements.txt

# Set environment
export GOOGLE_CLOUD_PROJECT=fanzone-ai
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
export GOOGLE_CLOUD_LOCATION=us-central1
export CRICKET_API_KEY=your-cricapi-key-here

# Run combined server (ADK Web UI + REST API on same port)
python -m uvicorn main:app --host 0.0.0.0 --port 8080
# → ADK Web UI: http://localhost:8080
# → REST API:   http://localhost:8080/api/*
```

### Standalone ADK Web UI (alternative)

```bash
export PATH="$HOME/.local/bin:$PATH"
pip install google-adk
adk web . --allow_origins="*"
# Open http://localhost:8000 → Select "fanzone_app"
```

---

## API Usage — Full Demo Flow

### Step 1: Check Live Matches
```bash
curl -s http://localhost:8080/api/live-matches | python3 -m json.tool
```

### Step 2: Get Live Scores
```bash
curl -s http://localhost:8080/api/live-scores | python3 -m json.tool
```

### Step 3: Get IPL Season Data
```bash
curl -s http://localhost:8080/api/ipl-matches | python3 -m json.tool
```

### Step 4: Get Match Details
```bash
curl -s http://localhost:8080/api/match/MATCH_ID_FROM_STEP_1 | python3 -m json.tool
```

### Step 5: Register as a Fan
```bash
curl -s -X POST http://localhost:8080/api/fan/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "fan-001",
    "display_name": "Kali",
    "favorite_team": "CSK",
    "bio": "Yellow Army forever! Whistle Podu!",
    "location": "Chennai"
  }' | python3 -m json.tool
```

### Step 6: Start a Match Discussion
```bash
curl -s -X POST http://localhost:8080/api/discussion/create \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "MATCH_ID",
    "user_id": "fan-001",
    "title": "What a chase by CSK!",
    "content": "That last over was absolutely insane. Dhoni walking out to a standing ovation!",
    "tags": "thriller,csk,dhoni"
  }' | python3 -m json.tool
```

### Step 7: Find Fellow Fans
```bash
curl -s http://localhost:8080/api/fan/team/CSK | python3 -m json.tool
```

### Step 8: Connect with a Fan
```bash
curl -s -X POST http://localhost:8080/api/connection/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id_1": "fan-001",
    "user_id_2": "fan-002",
    "match_id": "MATCH_ID",
    "reason": "Both celebrated CSK Super Over win together!"
  }' | python3 -m json.tool
```

### Step 9: Chat with the Agent
```bash
curl -s -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the live cricket scores right now?",
    "user_id": "fan-001"
  }' | python3 -m json.tool
```

### Step 10: Search Players
```bash
curl -s "http://localhost:8080/api/player/search?q=Virat%20Kohli" | python3 -m json.tool
```

---

## Deploy to Cloud Run

```bash
# 1. Set project
gcloud config set project fanzone-ai

# 2. Enable APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com

# 3. Deploy (auto-builds from source)
gcloud run deploy fanzone-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=fanzone-ai,GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_LOCATION=us-central1,CRICKET_API_KEY=your-key-here" \
  --memory 1Gi \
  --timeout 300

# 4. Test the deployed URL
URL="https://fanzone-ai-XXXXX-uc.a.run.app"
curl -s $URL/health
curl -s $URL/api/live-scores | python3 -m json.tool
# ADK Web UI: open $URL in browser
```

---

## Example Prompts to Test (ADK Web UI)

| Prompt | What Happens |
|--------|-------------|
| "What are the live cricket scores?" | Fetches real-time scores from CricAPI |
| "Show me IPL matches" | Gets current IPL season data |
| "Tell me about CSK" | Returns team fan data, rivalries, fun facts |
| "Register me as fan-001, I'm Kali, CSK fan from Chennai" | Creates fan profile |
| "Find other CSK fans" | Searches for fans with same loyalty |
| "Start a discussion about today's match" | Creates discussion thread |
| "Who is Virat Kohli?" | Fetches real player data from CricAPI |
| "Connect me with fan-002 over today's IPL match" | Creates match-anchored connection |

---

## Key Features

| Feature | Description |
|---------|-------------|
| Real-Time Scores | Live cricket data from CricAPI — no static/dummy data |
| Multi-Agent AI | Commander routes to 4 specialized agents via ADK |
| 19 MCP Tools | Match, Fan, Discussion, Connection — all wired to agents |
| Fan Matching | AI-powered discovery of fans with shared team loyalties |
| Match Discussions | Contextual threads centered around live/recent matches |
| Match-Anchored Connections | Every fan connection has a match story behind it |
| Emoji Reactions | React to discussions (🔥 💯 😢 🎉 👏) |
| API Caching | Smart TTL caching to minimize API calls |
| ADK Web UI | Built-in interactive chat for live testing |
| Firestore Persistence | Profiles, discussions, connections stored across restarts |

---

## License

MIT

Built with **Google ADK**, **Gemini 2.5 Flash**, **CricAPI**, and **Firestore** for the Google Gen AI Academy APAC Hackathon.
