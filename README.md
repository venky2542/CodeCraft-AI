# CodeCraft AI: AI-Powered Code Review Assistant

CodeCraft AI is a complete, production-ready, full-stack web application designed to automatically scan and audit source code files. It analyzes codebase segments for logical bugs, syntax errors, security vulnerabilities following the OWASP Top 10 guidelines (e.g. Broken Authentication, Cross-Site Scripting, SQL Injection, Hardcoded API Credentials), and suggests efficiency reformations and clean code refactoring.

## Features
- **Interchangeable Dual engine**: Leverages IBM Watsonx.ai (`ibm/granite-20b-code-instruct`) or seamlessly falls back to Google's fast and powerful Gemini (`gemini-3.5-flash`) so that it is instantly active in sandbox environments.
- **Drag-and-Drop Uploader**: Instantly detects and reads code attachments of any popular format (.py, .js, .java, .cpp, .html, .css, etc.).
- **Interactive Multi-Step Progress Tracker**: Visually renders analytical intervals for parsing structure, security reviews, and suggestion processing.
- **Robust Line Highlighting**: Clicking on any flagged vulnerability automatically scrolls to and highlights the target statement inside the source text view.
- **Segmented Auditing Tabs**: Organizes feedback into Overview, Vulnerabilities, Performance checklist, and complete Refactored Code with a single-click clipboard-copy mechanism.

---

## 🛠️ Environment Configuration (`.env`)

To configure the application, define the following variables inside your `.env` file at the root of the project:

```env
# --- IBM Watsonx.ai Credentials ---
# Acquire your API key from your IBM Cloud console: cloud.ibm.com
IBM_WATSONX_APIKEY="your_ibm_cloud_apikey"

# Locate your IBM watsonx.ai Project ID inside Watson Studio Projects
IBM_WATSONX_PROJECT_ID="your_watsonx_project_id"

# The IBM Watsonx API endpoint (defaults to US South region if undefined)
IBM_WATSONX_URL="https://us-south.ml.cloud.ibm.com"

# --- Google Gemini Fallback ---
# Automatically configured in the Google AI Studio environment
GEMINI_API_KEY="your_optional_gemini_api_key_override"
```

---

## 🚀 Standard Installation & Local Execution

### Option A: Running the Node.js Full-Stack App (Vite + Express)
The repository contains a fully integrated node backend proxying queries safely:
1. **Install Node modules**:
   ```bash
   npm install
   ```
2. **Start Development Environment**:
   ```bash
   npm run dev
   ```
   The application boots and runs on `http://localhost:3000`.

3. **Build and Run for Production**:
   ```bash
   npm run build
   ```
   Instantly compiles the browser interface into static assets and bundles `/server.ts` into a fast, encapsulated CommonJS distribution (`dist/server.cjs`).
   To run this bundle, execute:
   ```bash
   npm start
   ```

### Option B: Running the Standalone Python FastAPI Backend
For standalone python pipelines, use `/backend`:
1. **Initialize a Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Launch the Server**:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
   Your API will be running on `http://localhost:8000`. You can inspect the interactive OpenAPI endpoints at `http://localhost:8000/docs`.

---

## 🧠 Model Orchestration Details

The orchestrator utilizes **IBM Granite 20B Code Instruct** (`ibm/granite-20b-code-instruct`), a model highly fine-tuned for code comprehension, synthesis, and debugging. The inference utilizes a greedy decoding pattern with a strict temperature threshold of `0.2` to drive precise, reliable, and deterministic code reviews.
