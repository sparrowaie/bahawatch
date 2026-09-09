from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import random, os

app = FastAPI(title="BAHAWATCH AI Vision")

class AnalyzeRequest(BaseModel):
    photoUrl: str
    lat: Optional[float] = None
    lng: Optional[float] = None

@app.get("/health")
def health(): return {"ok": True, "model": "mock-heuristic-v1", "openai": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            r = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role":"user","content":[
                    {"type":"text","text":"Is this a flooded road? Return JSON only: {\"isFlood\": bool, \"severity\": \"Low|Moderate|High\", \"condition\": \"Passable|Difficult to Pass|Not Passable|Cleared\", \"confidence\": 0-1, \"reason\": string }"},
                    {"type":"image_url","image_url":{"url": req.photoUrl}}
                ]}],
                max_tokens=200
            )
            import json
            return json.loads(r.choices[0].message.content)
        except Exception as e:
            return {"isFlood": 1, "severity": "Moderate", "condition": "Difficult to Pass", "confidence": 0.68, "reason": f"OpenAI fallback: {e}"}
    severities = ["Low","Moderate","High"]
    conditions = ["Passable","Difficult to Pass","Not Passable"]
    is_flood = 1 if "demo" in req.photoUrl or random.random() > 0.15 else 0
    return {
        "isFlood": is_flood,
        "severity": random.choice(severities) if is_flood else "Low",
        "condition": random.choice(conditions) if is_flood else "Passable",
        "confidence": round(random.uniform(0.65, 0.92), 2),
        "reason": "Mock heuristic — no OPENAI_API_KEY set; install real YOLOv8 later"
    }

if __name__ == "__main__":
    import uvicorn; uvicorn.run(app, host="0.0.0.0", port=8000)
