import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

app = FastAPI(
    title="CodeCraft AI Backend",
    description="Python FastAPI Code Review Orchestrator powered by IBM watsonx.ai",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Retrieve variables
IBM_APIKEY = os.getenv("IBM_WATSONX_APIKEY")
PROJECT_ID = os.getenv("IBM_WATSONX_PROJECT_ID")
WATSONX_URL = os.getenv("IBM_WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

if not IBM_APIKEY:
    print("[WARNING] 'IBM_WATSONX_APIKEY' is missing from environmental records. The server will fail on inference unless configured.")
if not PROJECT_ID:
    print("[WARNING] 'IBM_WATSONX_PROJECT_ID' is missing from env.")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "watsonx_configured": bool(IBM_APIKEY),
        "watsonx_url": WATSONX_URL
    }

@app.post("/api/review")
async def review_code(
    code: Optional[str] = Form(None),
    fileName: Optional[str] = Form("snippet"),
    language: Optional[str] = Form("Auto-Detect"),
    file: Optional[UploadFile] = File(None)
):
    source_code = ""
    target_fileName = fileName or "unnamed_source_code"
    
    # 1. Capture code from file upload or raw pasted text
    if file:
        try:
            # Enforce 2MB size limit
            content_bytes = await file.read()
            if len(content_bytes) > 2 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File too large. Maximum size limit is 2MB.")
            source_code = content_bytes.decode("utf-8")
            target_fileName = file.filename
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Failed to decode text file. Ensure it is UTF-8 encoded.")
    elif code:
        source_code = code
    else:
        raise HTTPException(status_code=400, detail="You must upload a file or submit raw pasted code text.")

    if not source_code.strip():
         raise HTTPException(status_code=400, detail="Source code content cannot be empty.")

    # 2. Assert Watsonx credentials
    if not IBM_APIKEY:
        raise HTTPException(
            status_code=500, 
            detail="IBM Watsonx APIKEY is not configured on this server. Please configure IBM_WATSONX_APIKEY in .env."
        )

    try:
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai import Credentials

        credentials = Credentials(
            url=WATSONX_URL,
            api_key=IBM_APIKEY
        )

        model = ModelInference(
            model_id="ibm/granite-20b-code-instruct",
            credentials=credentials,
            project_id=PROJECT_ID,
            params={
                "decoding_method": "greedy",
                "max_new_tokens": 1500,
                "temperature": 0.2
            }
        )

        # 3. Create comprehensive review guidelines prompt
        system_prompt = f"""
You are CodeCraft AI, an expert code security auditor and elite principal engineer. 
Analyze the following source code for:
1. Bugs, syntax issues, logical traps, and runtime errors (High priority).
2. Security Vulnerabilities and exposures following the OWASP Top 10 guidelines (e.g. Injection, XSS, insecure cryptography).
3. Performance inefficiencies, memory leaks, and general design anti-patterns (Code Smells).
4. Formatting issues or code standard violations.

Provide a complete, production-ready, beautifully refactored version of the code that fixes the identified issues. It must maintain all original features, be fully functional, and follow developer best practices.

**FORCED RESPONSE FORMAT REQUIRED:**
You must return your complete response strictly in valid JSON format with no surroundings like ```json. Match the following schema:
{{
  "summary": "A brief natural-language summary analyzing the overall project quality, structural state, and high-level evaluation of the core problems found.",
  "vulnerabilities": [
    {{
      "severity": "High" | "Medium" | "Low",
      "pattern": "Brief name of weakness",
      "description": "Clear explanation of how the original code is exposed.",
      "line": "Line number (e.g. 'Line 14-18')",
      "recommendation": "Prescriptive steps on how we can mitigate this securely."
    }}
  ],
  "optimizations": [
    {{
      "category": "Performance" | "Code Smell" | "Formatting",
      "issue": "Identified bad practice or bottleneck",
      "suggestion": "Actionable refactoring suggestion",
      "benefit": "Core value provided"
    }}
  ],
  "refactoredCode": "The full complete refactored code file. No truncation, no skip comments.",
  "explanation": "Markdown description of what was refactored in code, what bugs were resolved, and how standards were addressed."
}}

CONTEXT:
- File Name: {target_fileName}
- Target Language: {language}

CODE TO AUDIT:
-----------------------------
{source_code}
-----------------------------
"""

        print(f"Orchestrating code review pipeline with Watsonx AI: {target_fileName}")
        result = model.generate_text(prompt=system_prompt)
        
        import json
        
        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            report_data = json.loads(cleaned)
        except Exception:
            # Fallback block parsing
            report_data = {
                "summary": "Raw review generated. System output parsing completed with warning.",
                "refactoredCode": source_code,
                "explanation": result
            }

        return {
            "reviewer": "IBM Watsonx (granite-20b-code-instruct)",
            "watsonx_active": True,
            "code_length": len(source_code),
            "fileName": target_fileName,
            "language": language,
            "report": report_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Watsonx AI Operation failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
