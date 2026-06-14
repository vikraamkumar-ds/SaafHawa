"""Configuration loaded from environment / .env file."""
import os
from dotenv import load_dotenv

load_dotenv()

# --- API tokens ---
WAQI_TOKEN = os.getenv("WAQI_TOKEN", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")  # optional fallback source

# --- Model / endpoints ---
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
WAQI_BASE_URL = "https://api.waqi.info"

# --- Cache TTLs (seconds) ---
AQI_TTL = int(os.getenv("AQI_TTL", "300"))      # 5 min for air data
PLAN_TTL = int(os.getenv("PLAN_TTL", "600"))    # 10 min for generated plans

# --- Supported areas ---
# Bare WAQI city keywords. These reliably resolve to Pakistani stations
# (e.g. US Embassy Lahore/Karachi/Islamabad). Sub-area `geo:` lookups were
# removed because WAQI returns the nearest station globally — for parts of
# Pakistan with sparse coverage the nearest station is across the border.
AREAS = {
    "lahore":    "lahore",
    "karachi":   "karachi",
    "islamabad": "islamabad",
}
DEFAULT_AREA = "lahore"

CACHE_DB = os.getenv("CACHE_DB", "saafhawa.db")
