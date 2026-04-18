"""FanZone AI — ADK web app entry point.

This module exposes root_agent for `adk web .` usage.
"""

from agents.commander import commander_agent

root_agent = commander_agent
