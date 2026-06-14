/* SaafHawa — frontend logic.
   Talks to the FastAPI backend at SAAFHAWA_CONFIG.API_BASE.
   If the backend is unreachable (CORS, offline, rate-limit, no key),
   we use a deterministic bilingual fallback identical in spirit to the
   one inside backend/llm.py, so the UI never goes blank. */

(function () {
  "use strict";
  const API = (window.SAAFHAWA_CONFIG && window.SAAFHAWA_CONFIG.API_BASE) || "";

  /* ------------------------------------------------------------------ data */

  // Single-pick locations. Each maps directly to a WAQI-resolved Pakistani
  // station via the backend AREAS dict. Sub-area lookups were removed because
  // WAQI returns the nearest station globally — for areas without a nearby
  // Pakistani station, that meant Indian/Kashmiri readings slipping through.
  const LOCATIONS = [
    { label: "Lahore",    key: "lahore"    },
    { label: "Karachi",   key: "karachi"   },
    { label: "Islamabad", key: "islamabad" },
  ];

  // Profile chips — mapped to backend Household flags.
  const PROFILES = [
    { id: "allergies",      label: "Pollen / environmental allergies" },
    { id: "child",          label: "Young child (under 12)" },
    { id: "elderly",        label: "Elderly (65+)" },
    { id: "pregnant",       label: "Pregnant" },
    { id: "heart_lung",     label: "Heart or lung condition" },
    { id: "outdoor_worker", label: "Works outdoors" },
    { id: "healthy",        label: "Generally healthy adult" }, // virtual: none selected
  ];

  const SUGGEST_EN = [
    "Is it safe to send the kids to school at 8am?",
    "Can I do my morning walk today?",
    "Should I keep the windows open tonight?",
    "Do I need a mask to go to the market?",
  ];
  const SUGGEST_UR = [
    "کیا 8 بجے بچوں کو اسکول بھیجنا محفوظ ہے؟",
    "کیا آج صبح کی واک کر سکتا ہوں؟",
    "کیا آج رات کھڑکیاں کھلی رکھوں؟",
    "کیا بازار جاتے وقت ماسک پہننا ہوگا؟",
  ];

  // ----- i18n: all UI strings -----
  const I18N = {
    en: {
      title:       "Your action plan",
      tagline:     "Air-quality data, turned into a decision you can act on — in your language.",
      step1:       "1 — Where are you",
      locationLabel: "Location",
      
      aqiLoading:  "Loading…",
      demoNote:    "Live AQI from open public sources (WAQI / aqicn).",
      step2:       "2 — Who are you protecting",
      step2Hint:   "Pick everyone in your home this affects. The advice changes for each.",
      cta:         "Get today's action plan",
      ctaWorking:  "Working…",
      step3:       "3 — Ask anything",
      askHint:     "Ask in plain words. SaafHawa answers for your air and your household.",
      askPlaceholder: "Is it safe to send the kids to school at 8am?",
      askBtn:      "Ask",
      doToday:     "Do this today",
      profiles: {
        allergies:      "Pollen / environmental allergies",
        child:          "Young child (under 12)",
        elderly:        "Elderly (65+)",
        pregnant:       "Pregnant",
        heart_lung:     "Heart or lung condition",
        outdoor_worker: "Works outdoors",
        healthy:        "Generally healthy adult",
      },
      stale:        "OFFLINE ESTIMATE",
      readingFor:   (a) => "Reading the air for " + a + "…",
      airQuality:   (cat, aqi) => "Air quality · " + cat + " · AQI " + aqi,
      srcAi:        "Generated live by AI · grounded in your air + household",
      srcFallback:  "Offline guidance · still tailored to your household",
    },
    ur: {
      title:       "آج کا منصوبہ",
      tagline:     "فضائی معیار کا ڈیٹا، عمل کے قابل فیصلہ — آپ کی زبان میں۔",
      step1:       "١ — آپ کہاں ہیں",
      locationLabel: "مقام",
      
      aqiLoading:  "لوڈ ہو رہا ہے…",
      demoNote:    "WAQI / aqicn کے کھلے ذرائع سے براہِ راست فضائی معیار۔",
      step2:       "٢ — آپ کس کی حفاظت کر رہے ہیں",
      step2Hint:   "گھر کے ہر فرد کو منتخب کریں جس پر اثر پڑتا ہے۔ مشورہ ہر ایک کے لیے بدلتا ہے۔",
      cta:         "آج کا منصوبہ حاصل کریں",
      ctaWorking:  "تیار ہو رہا ہے…",
      step3:       "٣ — کچھ بھی پوچھیں",
      askHint:     "آسان الفاظ میں پوچھیں۔ صاف ہوا آپ کے ماحول اور گھر والوں کے مطابق جواب دے گا۔",
      askPlaceholder: "کیا 8 بجے بچوں کو اسکول بھیجنا محفوظ ہے؟",
      askBtn:      "پوچھیں",
      doToday:     "آج یہ کریں",
      profiles: {
        allergies:      "پولن / ماحولیاتی الرجی",
        child:          "چھوٹا بچہ (12 سال سے کم)",
        elderly:        "بزرگ (65+)",
        pregnant:       "حاملہ خاتون",
        heart_lung:     "دل یا پھیپھڑوں کی بیماری",
        outdoor_worker: "باہر کام کرنے والا",
        healthy:        "عمومی طور پر صحت مند بالغ",
      },
      stale:        "آف لائن اندازہ",
      readingFor:   (a) => a + " کی ہوا پڑھی جا رہی ہے…",
      airQuality:   (cat, aqi) => "ہوا کا معیار · " + cat + " · AQI " + aqi,
      srcAi:        "AI نے براہِ راست تیار کیا · آپ کی ہوا اور گھر کے مطابق",
      srcFallback:  "آف لائن رہنمائی · پھر بھی آپ کے گھر کے مطابق",
    },
  };
  const t = () => I18N[state.lang];

  /* ------------------------------------------------------------- AQI bands */

  function categoryFor(aqi) {
    if (aqi <= 50)  return { en: "Good",                            ur: "اچھی",            cssVar: "--good" };
    if (aqi <= 100) return { en: "Moderate",                        ur: "معمولی",          cssVar: "--mod" };
    if (aqi <= 150) return { en: "Unhealthy for sensitive groups",  ur: "حساس افراد کے لیے مضر", cssVar: "--usg" };
    if (aqi <= 200) return { en: "Unhealthy",                       ur: "مضرِ صحت",        cssVar: "--unh" };
    if (aqi <= 300) return { en: "Very unhealthy",                  ur: "بہت مضر",         cssVar: "--vunh" };
    return            { en: "Hazardous",                            ur: "خطرناک",         cssVar: "--haz" };
  }

  function bandColor(cssVar) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || "#9aa";
  }

  /* ------------------------------------------------------------ app state */

  const state = {
    lang: "en",
    areaKey: "lahore",
    areaLabel: "Lahore",
    selected: new Set(["healthy"]),
    aqi: null,
  };

  /* ------------------------------------------------------------- helpers */

  function household() {
    // Map UI chips to backend Household model. "healthy" is virtual → all false.
    const hh = { child: false, elderly: false, pregnant: false,
                 allergies: false, heart_lung: false, outdoor_worker: false };
    if (!state.selected.has("healthy")) {
      state.selected.forEach(id => { if (id in hh) hh[id] = true; });
    }
    return hh;
  }

  function profileLabels() {
    return PROFILES
      .filter(p => state.selected.has(p.id) && p.id !== "healthy")
      .map(p => p.label);
  }

  async function api(path, opts) {
    if (!API) throw new Error("no-api-configured");
    const url = API.replace(/\/$/, "") + path;
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error("api-" + res.status);
    return res.json();
  }

  /* -------------------------------------------------------- i18n applier */

  function applyLang() {
    const L = t();
    const ur = state.lang === "ur";

    document.documentElement.lang = ur ? "ur" : "en";
    document.body.classList.toggle("lang-ur", ur);

    // every element with data-i18n="key" gets its text from I18N[lang][key]
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const k = el.dataset.i18n;
      if (k in L && typeof L[k] === "string") {
        el.textContent = L[k];
        el.classList.toggle("urdu", ur);
      }
    });

    const q = document.getElementById("q");
    if (q) { q.placeholder = L.askPlaceholder; q.classList.toggle("urdu", ur); }

    const go = document.getElementById("go");
    if (go && !go.disabled) go.textContent = L.cta;

    const ask = document.getElementById("ask");
    if (ask) ask.textContent = L.askBtn;

    document.querySelectorAll("#chips .chip").forEach(c => {
      const id = c.dataset.id;
      if (L.profiles[id]) c.textContent = L.profiles[id];
      c.classList.toggle("urdu", ur);
    });

    if (state.aqi) paintAqi();
    buildSuggest();
    if (state.lastPlan && document.getElementById("verdict").style.display === "block") {
      renderVerdict(state.lastPlan);
    }
  }

  /* ----------------------------------------------------------- AQI dial */

  async function loadAqi() {
    try {
      const data = await api("/aqi?area=" + encodeURIComponent(state.areaKey));
      state.aqi = data;
      paintAqi();
    } catch (err) {
      // Backend unreachable — show a reasonable placeholder for the area
      const fallback = offlineAqiFor(state.areaKey);
      state.aqi = fallback;
      paintAqi(true);
    }
  }

  function offlineAqiFor(areaKey) {
    // Sensible offline placeholder per city. Marked stale so user sees the tag.
    const seeds = { lahore: 178, karachi: 138, islamabad: 124 };
    const aqi = seeds[areaKey] || 150;
    return {
      area: areaKey, aqi, category: categoryFor(aqi).en,
      dominant_pollutant: "pm25", station: "offline estimate",
      updated: null, source: "fallback", stale: true,
    };
  }

  function paintAqi(stale) {
    const a = state.aqi; if (!a) return;
    const k = categoryFor(a.aqi);
    const L = t();
    const ur = state.lang === "ur";

    const dial = document.getElementById("dial");
    dial.textContent = a.aqi;
    dial.style.background = bandColor(k.cssVar);

    const cat = document.getElementById("aqiCat");
    cat.textContent = ur ? k.ur : k.en;
    cat.classList.toggle("urdu", ur);
    if (a.stale || stale) {
      const tag = document.createElement("span");
      tag.className = "stale-tag";
      tag.textContent = L.stale;
      cat.appendChild(tag);
    }

    const sub = document.getElementById("aqiSub");
    const upd = a.updated ? new Date(a.updated.replace(" ", "T")).toLocaleString(
                  ur ? "ur-PK" : "en-PK",
                  { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
    sub.textContent = ((a.dominant_pollutant || "PM2.5").toUpperCase()) +
                      " · " + (a.station || "—") + " · " + upd;
  }

  /* ---------------------------------------------------------- /plan call */

  async function getPlan() {
    const vEl = document.getElementById("verdict");
    vEl.style.display = "block";
    const a = state.aqi; if (!a) return;
    const k = categoryFor(a.aqi);

    // Header colored by band
    const vtop = document.getElementById("vtop");
    const col = bandColor(k.cssVar);
    vtop.style.background = "linear-gradient(140deg, " + col + ", color-mix(in srgb, " + col + " 75%, #000))";
    const L = t();
    document.getElementById("vrisk").textContent = L.airQuality(state.lang === "ur" ? k.ur : k.en, a.aqi);

    // loading
    document.getElementById("vmain").className = "vmain" + (state.lang === "ur" ? " urdu" : "");
    document.getElementById("vmain").textContent = L.readingFor(state.areaLabel);
    document.getElementById("vmirror").textContent = "";
    document.getElementById("actions").innerHTML =
      '<li><span class="skel" style="width:90%"></span></li>' +
      '<li><span class="skel" style="width:75%"></span></li>' +
      '<li><span class="skel" style="width:82%"></span></li>';
    document.getElementById("why").textContent = "";
    document.getElementById("srcTag").textContent = "";
    vEl.scrollIntoView({ behavior: "smooth", block: "start" });

    let plan;
    try {
      plan = await api("/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: state.areaKey, household: household() }),
      });
    } catch (err) {
      plan = offlinePlan(a, k);
    }
    renderVerdict(plan);
  }

  function offlinePlan(a, k) {
    const hh = household();
    const sensitive = hh.child || hh.elderly || hh.pregnant || hh.allergies || hh.heart_lung;
    const bad = a.aqi > 150;

    const steps_en = [], steps_ur = [];
    steps_en.push("Keep windows shut during peak hours (early morning, evening).");
    steps_ur.push("صبح اور شام کی پیک آورز میں کھڑکیاں بند رکھیں۔");
    if (bad) {
      steps_en.push("Run an air purifier, or keep one room sealed and clean.");
      steps_ur.push("ایئر پیوریفائر چلائیں یا ایک کمرے کو صاف رکھیں۔");
    }
    if (hh.child) {
      steps_en.push("Move the school run earlier; have the child wear a KN95/FFP2 mask.");
      steps_ur.push("بچے کو ماسک پہنائیں اور اسکول جلدی نکلیں۔");
    }
    if (hh.allergies) {
      steps_en.push("Rinse face and nose after coming inside to clear pollen.");
      steps_ur.push("اندر آنے کے بعد چہرہ اور ناک دھو لیں۔");
    }
    if (!hh.child && !hh.allergies) {
      steps_en.push("Postpone outdoor exercise until AQI drops below 100.");
      steps_ur.push("AQI 100 سے کم ہونے تک باہر ورزش مؤخر کریں۔");
    }

    return {
      area: a.area, aqi: a.aqi, category: k.en,
      verdict_en: bad
        ? (sensitive ? "Keep sensitive members indoors today — the air is unhealthy."
                     : "Limit outdoor time today; the air is unhealthy.")
        : "Outdoor activity is okay in short stretches; watch sensitive members.",
      verdict_ur: bad
        ? "آج حساس افراد کو گھر کے اندر رکھیں — ہوا مضرِ صحت ہے۔"
        : "آج باہر کم وقت گزاریں؛ حساس افراد احتیاط کریں۔",
      steps_en: steps_en.slice(0, 4),
      steps_ur: steps_ur.slice(0, 4),
      why_en: sensitive
        ? "Sensitive members react to fine particles well before healthy adults feel anything."
        : "Fine particles build up in the lungs even when the air looks clear.",
      why_ur: "باریک ذرات صحت مند بالغ سے پہلے حساس افراد کو متاثر کرتے ہیں۔",
      source: "fallback",
    };
  }

  function renderVerdict(p) {
    state.lastPlan = p;
    const ur = state.lang === "ur";

    const vm = document.getElementById("vmain");
    vm.className = "vmain" + (ur ? " urdu" : "");
    vm.textContent = ur ? p.verdict_ur : p.verdict_en;

    const mir = document.getElementById("vmirror");
    mir.className = "vmirror " + (ur ? "" : "urdu");
    mir.textContent = ur ? p.verdict_en : p.verdict_ur;

    const L = t();
    document.getElementById("actionsHead").textContent = L.doToday;
    document.getElementById("actionsHead").classList.toggle("urdu", ur);
    const ul = document.getElementById("actions");
    ul.className = "actions" + (ur ? " urdu" : "");
    ul.innerHTML = "";
    (ur ? p.steps_ur : p.steps_en).forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });

    const why = document.getElementById("why");
    why.className = "why" + (ur ? " urdu" : "");
    why.textContent = ur ? p.why_ur : p.why_en;

    document.getElementById("srcTag").textContent =
      p.source === "ai" ? L.srcAi : L.srcFallback;
  }

  /* ----------------------------------------------------------- /ask call */

  async function askNow() {
    const q = document.getElementById("q").value.trim();
    if (!q) return;
    const ur = state.lang === "ur";
    const ans = document.getElementById("answer");
    ans.style.display = "block";
    ans.className = "answer" + (ur ? " urdu" : "");
    ans.innerHTML = '<span class="skel" style="display:block;width:95%"></span>' +
                    '<span class="skel" style="display:block;width:70%;margin-top:8px"></span>';

    try {
      const r = await api("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: state.areaKey, household: household(), question: q }),
      });
      ans.textContent = ur ? r.answer_ur : r.answer_en;
    } catch (e) {
      // graceful offline answer
      const a = state.aqi || offlineAqiFor(state.areaKey);
      const bad = a.aqi > 150;
      ans.textContent = ur
        ? (bad ? "ابھی فضائی معیار خراب ہے — حساس افراد گھر کے اندر رہیں اور باہر جانا ضروری ہو تو ماسک پہنیں۔"
               : "ابھی ہوا مناسب ہے، لیکن حساس افراد باہر کا وقت محدود رکھیں۔")
        : (bad ? "Air is unhealthy right now — keep sensitive members indoors, and mask up if you must go out."
               : "Air is okay right now, but sensitive members should still keep outdoor time short.");
    }
  }

  /* ------------------------------------------------------------ bindings */

  function buildLocationSelect() {
    const sel = document.getElementById("location");
    if (!sel) return;
    sel.innerHTML = "";
    LOCATIONS.forEach(l => {
      const o = document.createElement("option");
      o.value = l.key; o.textContent = l.label;
      sel.appendChild(o);
    });
    sel.value = state.areaKey;
    sel.addEventListener("change", (e) => {
      state.areaKey = e.target.value;
      const found = LOCATIONS.find(l => l.key === e.target.value);
      state.areaLabel = found ? found.label : e.target.value;
      loadAqi();
    });
  }

  function buildChips() {
    const wrap = document.getElementById("chips");
    const L = t();
    PROFILES.forEach(p => {
      const b = document.createElement("button");
      b.className = "chip" + (state.selected.has(p.id) ? " on" : "");
      b.textContent = L.profiles[p.id] || p.label;
      b.dataset.id = p.id;
      b.onclick = () => {
        if (p.id === "healthy") {
          state.selected = new Set(["healthy"]);
        } else {
          state.selected.delete("healthy");
          if (state.selected.has(p.id)) state.selected.delete(p.id);
          else state.selected.add(p.id);
          if (state.selected.size === 0) state.selected.add("healthy");
        }
        Array.from(wrap.children).forEach(c =>
          c.classList.toggle("on", state.selected.has(c.dataset.id)));
      };
      wrap.appendChild(b);
    });
  }

  function buildSuggest() {
    const wrap = document.getElementById("suggest");
    const list = state.lang === "ur" ? SUGGEST_UR : SUGGEST_EN;
    wrap.innerHTML = "";
    list.forEach(s => {
      const b = document.createElement("button");
      b.textContent = s;
      b.onclick = () => { document.getElementById("q").value = s; askNow(); };
      wrap.appendChild(b);
    });
  }

  function bindLangToggle() {
    document.getElementById("langtog").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      state.lang = b.dataset.lang;
      Array.from(e.currentTarget.children).forEach(x =>
        x.classList.toggle("on", x === b));
      applyLang();
    });
  }

  function bindCTA() {
    document.getElementById("go").addEventListener("click", async () => {
      const btn = document.getElementById("go");
      const L = t();
      btn.disabled = true; btn.textContent = L.ctaWorking;
      try { await getPlan(); }
      finally { btn.disabled = false; btn.textContent = L.cta; }
    });
    document.getElementById("ask").addEventListener("click", askNow);
    document.getElementById("q").addEventListener("keydown", e => {
      if (e.key === "Enter") askNow();
    });
  }

  /* ------------------------------------------------------------------ boot */

  document.addEventListener("DOMContentLoaded", () => {
    buildLocationSelect();
    buildChips();
    buildSuggest();
    bindLangToggle();
    bindCTA();
    applyLang();        // sync all labels to current language
    loadAqi();
  });
})();
