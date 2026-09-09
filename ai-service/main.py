from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import random, os, json, base64

app = FastAPI(title="BAHAWATCH AI — opencode ai assist", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── models ──
class AnalyzeRequest(BaseModel):
    photoUrl: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class AnalyzeImageRequest(BaseModel):
    imageBase64: str  # data url or raw base64
    lat: Optional[float] = None
    lng: Optional[float] = None

class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None  # optional road/posts context injected by server
    roadName: Optional[str] = None

class SummarizeRequest(BaseModel):
    roadName: Optional[str] = None
    posts: Optional[List[dict]] = None
    bounds: Optional[str] = None

class AssistRequest(BaseModel):
    query: str
    roadName: Optional[str] = None
    posts: Optional[List[dict]] = None

BAHAWATCH_SYSTEM = """You are BAHAWATCH AI Assist — a helpful assistant for a community flood & road condition app in Iloilo, Philippines (around ISAT-U, La Paz).
You help users:
- Understand recent reports for a specific road (passable / difficult / not passable / cleared, severity low/moderate/high)
- Judge freshness: show reported time, warn that no report ≠ clear
- Safety: never tell users to enter floodwater, drive through floods, or use app while driving. Always remind to stay safe.
- Summarize timeline: e.g., Burgos St. High→Moderate→Cleared
Keep answers short, factual, and cite report ages. If no data, say so. Never claim real-time coverage or prediction.
"""

def _has_openai() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))

def _openai_client():
    try:
        from openai import OpenAI
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        return None

def _openai_chat(messages, model=None, max_tokens=600):
    model = model or os.getenv("AI_MODEL") or "gpt-4o-mini"
    client = _openai_client()
    if not client:
        return None
    try:
        r = client.chat.completions.create(
            model=model,
            messages=[m.model_dump() if hasattr(m, 'model_dump') else m for m in messages],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        return r.choices[0].message.content
    except Exception as e:
        return f"[OpenAI error fallback: {e}]"

def _openai_vision(image_base64: str, prompt: str, model=None):
    model = model or os.getenv("AI_VISION_MODEL") or "gpt-4o-mini"
    client = _openai_client()
    if not client:
        return None
    # ensure data url
    if not image_base64.startswith("data:"):
        image_base64 = f"data:image/jpeg;base64,{image_base64}"
    try:
        r = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_base64}}
            ]}],
            max_tokens=300,
        )
        return r.choices[0].message.content
    except Exception as e:
        return json.dumps({"isFlood": 1, "severity": "Moderate", "condition": "Difficult to Pass", "confidence": 0.68, "reason": f"OpenAI fallback: {e}"})

# ── health ──
@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "bahawatch-ai",
        "version": "2.0.0",
        "opencode": True,
        "model": os.getenv("AI_MODEL") or "gpt-4o-mini",
        "visionModel": os.getenv("AI_VISION_MODEL") or "gpt-4o-mini",
        "openai": _has_openai(),
        "endpoints": ["/analyze", "/analyze-image", "/chat", "/summarize", "/assist"],
    }

# ── vision analyze (legacy: photoUrl) ──
@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            r = client.chat.completions.create(
                model=os.getenv("AI_VISION_MODEL") or "gpt-4o-mini",
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": "Is this a flooded road? Return JSON only: {\"isFlood\": bool, \"severity\": \"Low|Moderate|High\", \"condition\": \"Passable|Difficult to Pass|Not Passable|Cleared\", \"confidence\": 0-1, \"reason\": string }"},
                    {"type": "image_url", "image_url": {"url": req.photoUrl}}
                ]}],
                max_tokens=200
            )
            return json.loads(r.choices[0].message.content)
        except Exception as e:
            return {"isFlood": 1, "severity": "Moderate", "condition": "Difficult to Pass", "confidence": 0.68, "reason": f"OpenAI fallback: {e}"}
    severities = ["Low", "Moderate", "High"]
    conditions = ["Passable", "Difficult to Pass", "Not Passable"]
    is_flood = 1 if "demo" in req.photoUrl or random.random() > 0.15 else 0
    return {
        "isFlood": is_flood,
        "severity": random.choice(severities) if is_flood else "Low",
        "condition": random.choice(conditions) if is_flood else "Passable",
        "confidence": round(random.uniform(0.65, 0.92), 2),
        "reason": "Mock heuristic — no OPENAI_API_KEY set; add key for real vision (opencode ai)"
    }

# ── vision analyze with base64 (for live CreatePost preview) ──
@app.post("/analyze-image")
def analyze_image(req: AnalyzeImageRequest):
    prompt = "Is this a flooded road? Return JSON only: {\"isFlood\": bool, \"severity\": \"Low|Moderate|High\", \"condition\": \"Passable|Difficult to Pass|Not Passable|Cleared\", \"confidence\": 0-1, \"reason\": string}. Be concise in reason."
    if _has_openai():
        raw = _openai_vision(req.imageBase64, prompt)
        if raw:
            try:
                # extract JSON if wrapped
                start, end = raw.find("{"), raw.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(raw[start:end+1])
                return json.loads(raw)
            except:
                return {"isFlood": 1, "severity": "Moderate", "condition": "Difficult to Pass", "confidence": 0.72, "reason": raw[:200]}
    # heuristic: random but stable-ish
    severities = ["Low", "Moderate", "High"]
    conditions = ["Passable", "Difficult to Pass", "Not Passable"]
    is_flood = random.choice([1, 1, 1, 0])
    return {
        "isFlood": is_flood,
        "severity": random.choice(severities) if is_flood else "Low",
        "condition": random.choice(conditions) if is_flood else "Passable",
        "confidence": round(random.uniform(0.62, 0.89), 2),
        "reason": "Heuristic mock — set OPENAI_API_KEY for real gpt-4o-mini vision"
    }

# ── chat assist ──
@app.post("/chat")
def chat(req: ChatRequest):
    # build messages with system + optional context
    msgs = [{"role": "system", "content": BAHAWATCH_SYSTEM}]
    if req.context:
        msgs.append({"role": "system", "content": f"Context (recent reports):\n{req.context[:6000]}"})
    if req.roadName:
        msgs.append({"role": "system", "content": f"User is asking about road: {req.roadName}"})
    for m in req.messages:
        msgs.append({"role": m.role, "content": m.content})

    if _has_openai():
        out = _openai_chat(msgs)
        if out and not out.startswith("[OpenAI error"):
            return {"reply": out, "model": os.getenv("AI_MODEL") or "gpt-4o-mini", "provider": "openai"}
            # fall through to heuristic if error
    # heuristic fallback — still useful
    last = req.messages[-1].content.lower() if req.messages else ""
    if "burgos" in last:
        reply = "Recent reports for **Burgos St. - ISAT-U Gate**: 3 posts — Not Passable (High) → Difficult (Moderate) → **Cleared (Low)** most recent. Reported ~45m ago. Tap Timeline to see full history. Remember: no report ≠ clear, and only submit from a safe location."
    elif "jandoni" in last or "jalandoni" in last:
        reply = "Recent for **Jalandoni St.**: Not Passable (High) reported ~1h ago. No Cleared update yet — consider alternative route and check again. Don't enter floodwater to verify."
    elif "safe" in last or "safety" in last:
        reply = "Safety first: do NOT enter floodwater, don't stop in a dangerous spot, don't use the app while driving. Submit only from a safe location. If you're not safe, don't capture."
    elif "how" in last and "report" in last:
        reply = "To report: go to Post Report (photo mandatory), capture the flooded road from a safe spot, allow geolocation, confirm safety, then Post. AI will validate and show on Feed & Map."
    else:
        reply = "I can help with road conditions around ISAT-U (La Paz). Ask like: 'What's the condition of Burgos St.?' or 'Is Jalandoni passable?' — I summarize recent reports, freshness, and status. (Set OPENAI_API_KEY for full AI; using heuristic now.)"
    return {"reply": reply, "model": "heuristic-mock", "provider": "mock"}

# ── summarize road/area ──
@app.post("/summarize")
def summarize(req: SummarizeRequest):
    posts = req.posts or []
    if not posts:
        return {"summary": "No recent reports for this area. No report ≠ clear — if you're safe nearby, consider capturing a photo.", "count": 0}
    # build textual context
    lines = []
    for p in posts[:12]:
        lines.append(f"- {p.get('roadName','?')} · {p.get('roadCondition','?')} · {p.get('severity','?')} · {p.get('status','?')} · {p.get('timestamp','')[:16]}")
    context = "\n".join(lines)
    if _has_openai():
        msgs = [
            {"role": "system", "content": BAHAWATCH_SYSTEM},
            {"role": "user", "content": f"Summarize these {len(posts)} recent reports for {req.roadName or 'the area'} in 2-3 sentences. Mention freshness, verification, and whether cleared. Warn if data is sparse.\n\nReports:\n{context}"}
        ]
        out = _openai_chat(msgs, max_tokens=280)
        if out and not out.startswith("[OpenAI error"):
            return {"summary": out, "count": len(posts), "model": os.getenv("AI_MODEL") or "gpt-4o-mini"}
    # heuristic summary
    conds = [p.get('roadCondition') for p in posts[:5]]
    latest = posts[0] if posts else {}
    summary = f"**{len(posts)} reports** for {req.roadName or 'this area'}. Latest: **{latest.get('roadCondition','?')}** ({latest.get('severity','?')}) — {latest.get('status','?')} · {latest.get('timestamp','')[:16]}. "
    if latest.get('roadCondition') == 'Cleared':
        summary += "Road recently marked Cleared (green) — but verify freshness before traveling."
    elif 'Not Passable' in conds:
        summary += "Some roads still Not Passable (deep red) — check Timeline and avoid if not verified."
    else:
        summary += "Mixed conditions — check Timeline for how it changed over time."
    summary += " Remember: reports are community-sourced and time-stamped."
    return {"summary": summary, "count": len(posts), "model": "heuristic-mock"}

# ── assist (single query + posts context → reply) ──
@app.post("/assist")
def assist(req: AssistRequest):
    # convenience wrapper around chat
    posts = req.posts or []
    context = ""
    if posts:
        lines = [f"- {p.get('roadName','?')} · {p.get('roadCondition')} · {p.get('severity')} · {p.get('status')} · {p.get('timestamp','')[:16]}" for p in posts[:12]]
        context = "\n".join(lines)
    msgs = [{"role": "system", "content": BAHAWATCH_SYSTEM}]
    if context:
        msgs.append({"role": "system", "content": f"Recent reports context:\n{context}"})
    if req.roadName:
        msgs.append({"role": "system", "content": f"Focused road: {req.roadName}"})
    msgs.append({"role": "user", "content": req.query})
    if _has_openai():
        out = _openai_chat(msgs)
        if out and not out.startswith("[OpenAI error"):
            return {"reply": out, "model": os.getenv("AI_MODEL") or "gpt-4o-mini"}
    # fallback heuristics delegated to chat logic
    return chat(ChatRequest(messages=[ChatMessage(role="user", content=req.query)], context=context, roadName=req.roadName))

if __name__ == "__main__":
    import uvicorn; uvicorn.run(app, host="0.0.0.0", port=8000)
