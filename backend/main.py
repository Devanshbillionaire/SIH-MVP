import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from agent.planner import AgentPlanner
from storage.interaction_store import InteractionStore

app = FastAPI(
    title="PrivaSight API",
    description="PrivaSight - Visual-First Intelligent Browser Agent MVP Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
DEMO_SITES_DIR = os.path.join(os.path.dirname(BASE_DIR), "demo-sites")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "screenshots"), exist_ok=True)

app.mount("/demo-sites", StaticFiles(directory=DEMO_SITES_DIR), name="demo-sites")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

planner = AgentPlanner()
store = InteractionStore()

class TaskRequest(BaseModel):
    task: str
    demo_site: str = "search"
    ui_version: str = "A"
    target_url: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "PrivaSight API",
        "version": "1.0.0"
    }

@app.get("/api/status")
def get_status():
    return {
        "status": "ready",
        "agent": "PrivaSight",
        "browser_engine": "Playwright Chromium",
        "fuzzy_engine": "scikit-fuzzy",
        "ml_engine": "scikit-learn RandomForest"
    }

@app.get("/api/demo-sites")
def get_demo_sites():
    return {
        "demo_sites": [
            {
                "id": "search",
                "name": "Course Finder Website",
                "description": "Demonstrates fuzzy search input matching, course card filtering, and result link selection."
            },
            {
                "id": "form",
                "name": "Participant Registration Form",
                "description": "Demonstrates field label matching, privacy-aware sanitization, and form submission verification."
            },
            {
                "id": "ecommerce",
                "name": "Gadget E-Commerce Store",
                "description": "Demonstrates product catalog search, 'Add to Cart' / 'Put in Bag' alternative action matching."
            },
            {
                "id": "booking",
                "name": "Flight Booking Portal",
                "description": "Demonstrates multi-input origin/destination matching and flight ticket reservation workflows."
            }
        ]
    }

@app.get("/api/learning-stats")
def get_learning_stats():
    return store.get_stats()

@app.post("/api/reset-learning")
def reset_learning():
    store.reset_store()
    return {"message": "Learning store reset to seed baseline.", "stats": store.get_stats()}

@app.post("/api/run-task")
async def run_task(req: TaskRequest):
    if not req.task or not req.task.strip():
        raise HTTPException(status_code=400, detail="Task prompt cannot be empty.")
    
    url_in_prompt = re.search(r'https?://[^\s]+', req.task)
    override_url = req.target_url or (url_in_prompt.group(0) if url_in_prompt else None)

    try:
        result = await planner.execute_task(
            task_prompt=req.task.strip(),
            demo_site=req.demo_site,
            ui_version=req.ui_version,
            target_url_override=override_url
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
