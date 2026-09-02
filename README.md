# Visual-First Intelligent Browser Agent

> **Smart India Hackathon (SIH) MVP Project**  
> A lightweight, robust AI browser automation system combining DOM perception, visual heuristics, `scikit-learn` machine learning, `scikit-fuzzy` decision engine, Playwright browser execution, automated result verification, and privacy-aware feature logging.

---

## 1. Project Overview

Traditional browser automation scripts (Selenium, Playwright locators) break frequently whenever target webpage DOM structure, CSS classes, IDs, or element hierarchy changes.

The **Visual-First Intelligent Browser Agent** overcomes this limitation by evaluating UI elements using a multi-factor perception and decision-making architecture:
1. **Natural-Language Intent Parser**: Extracts high-level intent (`SEARCH`, `OPEN_RESULT`, `FILL_FORM`, `CLICK_ELEMENT`, `NAVIGATE`) from plain English prompts.
2. **DOM + Visual Perception**: Inspects element attributes, bounding box spatial coordinates, viewport visibility, and captures visual page screenshots.
3. **Multi-Factor Element Scorer**: Calculates Text Similarity, DOM Confidence, Visual Confidence, and ML Confidence.
4. **Scikit-Fuzzy Decision Engine**: Evaluates confidence levels and risk using fuzzy inference rules to determine whether to `EXECUTE`, `VERIFY`, `RETRY`, or `ASK_USER`.
5. **Playwright Execution Engine**: Executes browser actions (`CLICK`, `TYPE`, `PRESS_ENTER`, `NAVIGATE`) with multi-strategy fallbacks.
6. **Automated Verification**: Checks whether the expected outcome occurred (URL change, text presence, success banners).
7. **Privacy-Aware Learning**: Redacts personal information (emails, passwords, phone numbers) and logs abstract numerical features into local JSON storage to continuously update the `scikit-learn` model.

---

## 2. System Architecture

```
                                  +---------------------------------------+
                                  |      User Natural Language Prompt     |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         Rule-Based Intent Parser      |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Playwright DOM + Visual Perception |
                                  | (Bounding Boxes, Selectors, Screens)  |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |     Candidate Element Scoring         |
                                  |  - Text Similarity (Fuzzy Tokens)     |
                                  |  - DOM Confidence (Semantic Tags)     |
                                  |  - Visual Confidence (Coordinates)    |
                                  |  - ML Prediction Probability          |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Scikit-Fuzzy Decision Engine       |
                                  | [EXECUTE | VERIFY | RETRY | ASK_USER] |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |     Playwright Action Execution       |
                                  |   (CLICK, TYPE, PRESS_ENTER, NAV)     |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |       Automated Verifier Engine       |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Privacy Sanitizer & Feature Store  |
                                  |      (Scikit-Learn Online Retrain)    |
                                  +---------------------------------------+
```

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **UI Design**: Modern, clean, light-colored dashboard optimized for live hackathon presentations.

### Backend
- **Framework**: Python 3.14 + FastAPI + Uvicorn
- **Browser Automation**: Playwright Python (Chromium Engine)
- **Machine Learning**: `scikit-learn` (RandomForestClassifier)
- **Fuzzy Logic**: `scikit-fuzzy` (`skfuzzy`)
- **Data & Utilities**: `numpy`, `scipy`, `networkx`, `pydantic`

---

## 4. Local Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and `npm`

### Step 1: Clone & Setup Backend
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright Chromium browser binaries
playwright install chromium
```

### Step 2: Setup Frontend
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node modules
npm install
```

---

## 5. Running the Application

### Option A: Run Backend & Frontend Separately

1. **Start Backend Server**:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *FastAPI server will run on `http://localhost:8000`*

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   *React Dashboard will run on `http://localhost:3000`*

---

## 6. Demo Scenarios & UI Version Resilience

The repository includes **3 controlled local demo sites** serving both **Version A** (standard selectors) and **Version B** (modified DOM selectors, classes, IDs, placeholders, and button labels):

| Demo Site | Task Prompt Example | Version A Selectors | Version B Modified Selectors |
| :--- | :--- | :--- | :--- |
| **Search Site** | *"Search for Python courses and open the first result"* | `#search-input`, `.search-btn` | `input[name='query_term']`, `.find-input-v2`, `Explore Now` |
| **Form Site** | *"Fill registration form for Alex Johnson"* | `#fullName`, `#email`, `#btn-submit` | `input[name='candidate_name']`, `.v2-submit-action` |
| **E-Commerce** | *"Search for headphones and add to cart"* | `#store-search`, `.add-cart-btn` | `input[name='catalog_search']`, `Put in Bag` |

### How to Demonstrate Robustness:
1. Select **Search Site** and choose **Version A**. Click **RUN AGENT**. Observe successful task completion.
2. Toggle to **Version B** (which has completely altered DOM topology).
3. Run the exact same task prompt again.
4. The agent will successfully perceive the search field and result links through **Text Similarity + DOM Role + Bounding Box Coordinates**, demonstrating immunity to hard-coded selector breaks!

---

## 7. Explainable AI: Fuzzy Logic & Privacy-Aware ML

### Scikit-Fuzzy Decision Engine Rules
The decision engine evaluates 4 inputs (`visual_confidence`, `dom_confidence`, `ml_confidence`, `risk_level`) against triangular membership functions:
- **IF** Visual `HIGH` **AND** DOM `HIGH` **AND** Risk `LOW` $\rightarrow$ **EXECUTE** (Score $> 72$)
- **IF** Visual `MEDIUM` **OR** DOM `MEDIUM` $\rightarrow$ **VERIFY** ($50 \le$ Score $\le 72$)
- **IF** Visual `LOW` **AND** DOM `LOW` $\rightarrow$ **RETRY** (Score $< 35$)
- **IF** Risk `HIGH` $\rightarrow$ **ASK_USER**

### Privacy-Aware Learning System
Before logging interaction features to `storage/interactions.json`, `privacy/data_filter.py` strips all passwords, emails, phone numbers, and raw query text:
```json
{
  "timestamp": 1788078720.73,
  "intent": "SEARCH",
  "element_type": "input",
  "visual_confidence": 0.95,
  "dom_confidence": 0.98,
  "text_similarity": 0.88,
  "ml_confidence": 1.0,
  "fuzzy_confidence": 0.8825,
  "action_type": "EXECUTE",
  "ui_version": "B",
  "demo_site": "search",
  "success": true,
  "sanitized_query_length": 51,
  "privacy_sanitized": true
}
```

---

## 8. Scientific Honesty & Limitations

- **Scope**: This system is a lightweight MVP prototype created for demonstration purposes. It does not claim human-level AGI or complete autonomy across arbitrary web domains.
- **Visual Perception**: Visual confidence is calculated using viewport spatial heuristics and bounding box coordinates rather than a heavy vision-language model (VLM).
- **Privacy Guarantee**: Data filtering strips personal identifying patterns locally; however, users should avoid entering confidential enterprise data into experimental agent interfaces.

---

## 9. API Reference

- `POST /api/run-task`: Runs the agent workflow. Body: `{"task": "...", "demo_site": "search", "ui_version": "A"}`
- `GET /api/status`: Returns system components health.
- `GET /api/learning-stats`: Returns interaction counts, success rate, confidence evolution.
- `GET /api/demo-sites`: Returns available controlled demo sites.
- `POST /api/reset-learning`: Resets interaction store to seed baseline.
