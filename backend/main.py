import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from storage.interaction_store import InteractionStore
from ml.learning import AgentLearningPipeline
from agent.llm_intent_parser import HybridLLMIntentParser

app = FastAPI(title="PrivaSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = InteractionStore()

class TaskRequest(BaseModel):
    task: str
    url: Optional[str] = None
    information: Optional[str] = None
    demo_site: Optional[str] = "form"
    ui_version: Optional[str] = "A"

@app.get("/api/status")
def get_status():
    return {
        "status": "ready",
        "agent": "PrivaSight",
        "ml": "RandomForest Classifier",
        "fuzzy": "Scikit-Fuzzy Engine",
        "privacy": "Active"
    }

@app.get("/api/learning-stats")
def get_learning_stats():
    return store.get_learning_stats()

@app.post("/api/reset-learning")
def reset_learning():
    store._init_seed_data()
    return {"message": "Store reset to seed", "stats": store.get_learning_stats()}

@app.post("/api/parse-intent")
def parse_intent(req: TaskRequest):
    return HybridLLMIntentParser.parse_intent(req.task or req.information or "")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
