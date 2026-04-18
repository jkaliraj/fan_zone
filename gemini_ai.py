"""FanZone AI — Gemini 2.5 Flash integration for AI-powered fan features."""

import os
from google import genai
from google.genai import types


def _get_client():
    """Get Gemini client — uses Vertex AI (ADC) on Cloud Run, API key locally."""
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").upper() == "TRUE"

    if use_vertex and project:
        return genai.Client(vertexai=True, project=project, location=location)
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if api_key:
        return genai.Client(api_key=api_key)
    # Fallback to Vertex
    return genai.Client(vertexai=True, project=project, location=location)


MODEL = "gemini-2.5-flash"


async def ai_chat(message: str, context: str = "") -> str:
    """General fan chat powered by Gemini."""
    client = _get_client()
    system = """You are FanZone AI, a passionate cricket companion for fans.
You help with live scores, match analysis, team info, player stats, and fan connections.
Be enthusiastic, knowledgeable, and use cricket terminology naturally.
Keep responses concise but engaging. Use emojis sparingly (🏏 🔥 💯).
If asked about live data, explain that users can check the Live Scores tab for real-time updates."""

    if context:
        system += f"\n\nCurrent context:\n{context}"

    response = client.models.generate_content(
        model=MODEL,
        contents=message,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )
    return response.text


async def ai_match_analysis(match_data: dict) -> str:
    """Generate AI analysis of a match."""
    client = _get_client()
    prompt = f"""Analyze this cricket match and give a brief, exciting summary for fans.
Focus on key moments, standout performances, and what made it special.
Keep it to 3-4 sentences, make it engaging.

Match data: {match_data}"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are an expert cricket analyst writing for passionate fans.",
            temperature=0.8,
            max_output_tokens=300,
        ),
    )
    return response.text


async def ai_fan_matchmaker(fan_profile: dict, other_fans: list) -> str:
    """AI-powered fan connection suggestions."""
    client = _get_client()
    prompt = f"""Given this fan's profile and a list of other fans, suggest the best connections
and explain WHY they'd get along. Focus on shared team loyalty, location, and cricket passion.

Fan: {fan_profile}
Other fans: {other_fans}

Give 2-3 connection suggestions with fun, enthusiastic reasoning."""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are a cricket community matchmaker. Be warm and fun.",
            temperature=0.8,
            max_output_tokens=500,
        ),
    )
    return response.text


async def ai_discussion_starter(match_data: dict) -> str:
    """Generate AI-suggested discussion topics for a match."""
    client = _get_client()
    prompt = f"""Based on this cricket match, suggest 3 engaging discussion topics
that fans would love to debate. Format as a JSON array of objects with 'title' and 'prompt' keys.

Match: {match_data}"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You create engaging cricket discussion topics. Return valid JSON only.",
            temperature=0.9,
            max_output_tokens=400,
        ),
    )
    return response.text
