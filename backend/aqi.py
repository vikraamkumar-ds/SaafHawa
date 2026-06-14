"""Air-quality data: WAQI primary, OpenWeather fallback, last-good offline fallback."""
import httpx
import cache
import config
from models import AqiResponse


def category_for(aqi: int) -> str:
    """Honest US-EPA health categories. No sugar-coating."""
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


async def _from_waqi(area: str) -> AqiResponse:
    keyword = config.AREAS.get(area, area)
    url = f"{config.WAQI_BASE_URL}/feed/{keyword}/"
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(url, params={"token": config.WAQI_TOKEN})
        r.raise_for_status()
        data = r.json()
    if data.get("status") != "ok":
        raise ValueError(f"WAQI status: {data.get('status')}")
    d = data["data"]
    aqi = int(d["aqi"])
    station_name = (d.get("city") or {}).get("name", "")
    # Defensive: if WAQI returns a station outside Pakistan, reject so we
    # can fall back to last-good rather than show foreign data.
    if station_name and not _looks_like_pakistan(station_name, d):
        raise ValueError(f"WAQI returned non-Pakistan station: {station_name}")
    return AqiResponse(
        area=area,
        aqi=aqi,
        category=category_for(aqi),
        dominant_pollutant=d.get("dominentpol"),
        station=station_name,
        updated=(d.get("time") or {}).get("s"),
        source="waqi",
    )


def _looks_like_pakistan(name: str, d: dict) -> bool:
    """Three-tier check:
       1) hard-reject if the station name names a foreign country or city near
          the border (Srinagar, Amritsar, Delhi, etc) — these get geographically
          close enough to slip a naive bbox check;
       2) accept if the name mentions Pakistan or a Pakistani city;
       3) accept if the coords fall inside a tight Pakistan bounding box.
    """
    n = name.lower()

    # 1) hard-reject foreign markers
    foreign = [
        "india", "indian", "kashmir", "j&k", "jammu",
        "srinagar", "amritsar", "delhi", "new delhi", "noida", "gurgaon",
        "punjab, india",  # WAQI sometimes labels Indian Punjab this way
        "afghanistan", "kabul", "iran", "tehran",
        "china", "beijing", "shanghai",
        "turkey", "kocaeli", "istanbul",
        "colombia", "medellín", "medellin", "itagüí", "itagui",
    ]
    if any(w in n for w in foreign):
        return False

    # 2) accept by PK keyword
    pk_words = ["pakistan", "lahore", "karachi", "islamabad", "rawalpindi",
                "peshawar", "quetta", "multan", "faisalabad", "hyderabad,",
                "sialkot", "gujranwala", "sargodha", "bahawalpur"]
    if any(w in n for w in pk_words):
        return True

    # 3) accept by tight bbox. Pakistan's effective east boundary is
    # ~75°E (Lahore is 74.34°E); anything east of 75.2 is India.
    geo = (d.get("city") or {}).get("geo")
    if isinstance(geo, list) and len(geo) == 2:
        lat, lng = geo
        if 23.7 <= lat <= 37.1 and 60.9 <= lng <= 75.2:
            return True
    return False


async def get_aqi(area: str) -> AqiResponse:
    area = area.lower().strip()
    ckey = f"aqi:{area}"

    cached = cache.get(ckey)
    if cached and _payload_is_pakistan(cached):
        return AqiResponse(**cached)

    try:
        result = await _from_waqi(area)
        payload = result.model_dump()
        cache.set(ckey, payload, config.AQI_TTL)
        cache.set_last_good(ckey, payload)   # remember for offline use
        return result
    except Exception:
        # graceful offline fallback: serve last-good only if it's also PK
        last = cache.get_last_good(ckey)
        if last and _payload_is_pakistan(last):
            last["stale"] = True
            return AqiResponse(**last)
        # absolute last resort so the UI never shows nothing
        return AqiResponse(
            area=area, aqi=150,
            category=category_for(150),
            dominant_pollutant="pm25",
            station="offline estimate",
            source="fallback", stale=True,
        )


def _payload_is_pakistan(payload: dict) -> bool:
    """Belt-and-braces — protects against cache poisoning from older versions
    that may have stored foreign readings under PK area keys."""
    station = (payload.get("station") or "").lower()
    if not station or station == "offline estimate":
        return True
    # hard-reject foreign markers (matches _looks_like_pakistan)
    foreign = ["india", "indian", "kashmir", "j&k", "jammu",
               "srinagar", "amritsar", "delhi", "new delhi",
               "afghanistan", "kabul", "iran", "tehran",
               "china", "turkey", "kocaeli", "istanbul",
               "colombia", "medellín", "medellin", "itagüí", "itagui"]
    if any(w in station for w in foreign):
        return False
    pk_words = ["pakistan", "lahore", "karachi", "islamabad", "rawalpindi",
                "peshawar", "quetta", "multan", "faisalabad", "hyderabad,",
                "sialkot", "gujranwala", "sargodha"]
    return any(w in station for w in pk_words)
