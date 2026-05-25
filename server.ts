import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup express JSON and urlencoded parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Setup multer for multi-part file uploads (limit to 2MB)
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB size limit
  storage: multer.memoryStorage(),
});

// Configure Google GenAI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Helper to exchange IBM Watsonx.ai key for an IAM Access Token
 */
async function getWatsonxAccessToken(apiKey: string): Promise<string> {
  const url = "https://iam.cloud.ibm.com/identity/token";
  const params = new URLSearchParams();
  params.append("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
  params.append("apikey", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to authenticate with IBM Cloud IAM: ${errText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Helper to make a text generation call to IBM Watsonx.ai raw REST endpoints
 */
async function generateWatsonxReview(
  apiKey: string,
  projectId: string,
  watsonxUrl: string,
  prompt: string
): Promise<string> {
  const token = await getWatsonxAccessToken(apiKey);
  
  // Normalize/clean URL
  const baseUrl = watsonxUrl.replace(/\/$/, "");
  const generationUrl = `${baseUrl}/ml/v1/text/generation?version=2023-05-29`;

  const requestBody = {
    model_id: "ibm/granite-20b-code-instruct",
    project_id: projectId,
    input: prompt,
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: 1500,
      temperature: 0.2,
    },
  };

  const response = await fetch(generationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IBM Watsonx.ai generation failed: ${errorText}`);
  }

  const data = await response.json() as {
    results: Array<{ generated_text: string }>;
  };

  if (!data?.results?.[0]?.generated_text) {
    throw new Error("No text generated from IBM Watsonx.ai");
  }

  return data.results[0].generated_text;
}

// Prompt instructing the backend LLM on review guidelines
const buildPrompt = (code: string, fileName: string, targetLanguage: string) => `
You are CodeCraft AI, an expert code security auditor and elite principal engineer. 
Analyze the following source code for:
1. Bugs, syntax issues, logical traps, and runtime errors (High priority).
2. Security Vulnerabilities and exposures following the OWASP Top 10 guidelines (e.g. Injection, XSS, broken auth, weak cryptography, hardcoded secrets).
3. Performance inefficiencies, memory leaks, and general design anti-patterns (Code Smells).
4. Formatting issues or code standard violations.

Provide a complete, production-ready, beautifully refactored version of the code that fixes the identified issues. It must maintain all requested features, be fully functional, and follow best practices.

**FORCED RESPONSE FORMAT REQUIRED:**
You must return your complete response strictly in valid JSON format. Do not prepend markdown block triggers like \`\`\`json. Return only raw JSON that matches the following schema:
{
  "summary": "A brief natural-language summary analyzing the overall project quality, structural state, and high-level evaluation of the core problems found.",
  "vulnerabilities": [
    {
      "severity": "High" | "Medium" | "Low",
      "pattern": "Brief name of the weakness/OWASP class",
      "description": "Clear explanation of how the original code is exposed and what harm could result.",
      "line": "Line number or block name (e.g. 'Line 14-18')",
      "recommendation": "Prescriptive steps on how we can mitigate this securely."
    }
  ],
  "optimizations": [
    {
      "category": "Performance" | "Code Smell" | "Formatting",
      "issue": "Identified bad practice or bottleneck",
      "suggestion": "Actionable refactoring suggestion",
      "benefit": "Core value provided (e.g. O(1) latency reduction, readability improvement)"
    }
  ],
  "refactoredCode": "The full complete refactored code file. No truncation, no skip comments.",
  "explanation": "A natural language explanation describing what was refactored in code, what bugs were resolved, and how format/standards were addressed."
}

CONTEXT OF CODE FILE:
- File Name: ${fileName || "code_snippet"}
- Target Language: ${targetLanguage || "Auto-detect"}

SOURCE CODE FOR AUDIT:
-----------------------------
${code}
-----------------------------

Remember: Return strictly valid, parsable, schema-compliant JSON with no surrounding markdown block decorations. Escape double quotes and newlines in text fields carefully.
`;

// Helper to try parsing JSON response from LLM, with fallback regex extractor
function cleanAndParseJSON(rawStr: string) {
  let cleaned = rawStr.trim();
  
  // Strip code blocks if the model ignored instructions
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("Direct JSON parsing failed. Attempting robust parsing with regex fallback.", err);
    
    // Attempt to extract the first full JSON object
    const firstOpen = cleaned.indexOf("{");
    const lastClose = cleaned.lastIndexOf("}");
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      try {
        const extracted = cleaned.substring(firstOpen, lastClose + 1);
        return JSON.parse(extracted);
      } catch (innerErr) {
        // Fallback placeholder structure
        return {
          summary: "An error occurred parsing the structured review. Displaying raw model text for insights.",
          vulnerabilities: [
            {
              severity: "High",
              pattern: "JSON Parsing Error",
              description: "The AI reviewed your code successfully, but returned an unstructured JSON response.",
              line: "System",
              recommendation: "Refer to the raw summary or retry analysis."
            }
          ],
          optimizations: [
            {
              category: "AI Output Formatting",
              issue: "Output structure was raw string",
              suggestion: "Review the full report manually",
              benefit: "Retrieve valuable diagnostic insights"
            }
          ],
          refactoredCode: codePlaceholder(cleaned),
          explanation: cleaned
        };
      }
    }
    throw new Error("Could not parse LLM output as JSON");
  }
}

function codePlaceholder(raw: string): string {
  // Try to find code block in raw string
  const match = raw.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return match ? match[1] : `// CodeCraft AI was unable to parse refactored code block.\n// Raw output details are in the tabs.`;
}

/**
 * Health endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    watsonx_configured: !!process.env.IBM_WATSONX_APIKEY,
    gemini_configured: !!process.env.GEMINI_API_KEY,
  });
});

/**
 * Core Review Endpoint (/api/review)
 */
app.post("/api/review", upload.single("file"), async (req, res): Promise<any> => {
  try {
    let sourceCode = "";
    let fileName = "";
    let targetLanguage = "Auto-Detect";

    // 1. Process inputs from multi-part form or JSON body
    if (req.file) {
      sourceCode = req.file.buffer.toString("utf8");
      fileName = req.file.originalname;
      targetLanguage = req.body.language || "Auto-Detect";
    } else {
      sourceCode = req.body.code || "";
      fileName = req.body.fileName || "unnamed_source_code";
      targetLanguage = req.body.language || "Auto-Detect";
    }

    if (!sourceCode.trim()) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Source code of some form must be paste or uploaded as a file.",
      });
    }

    const compiledPrompt = buildPrompt(sourceCode, fileName, targetLanguage);

    const useWatsonx = !!process.env.IBM_WATSONX_APIKEY;
    let reviewerName = "";
    let rawResponse = "";

    // 2. Perform inference
    if (useWatsonx) {
      const apiKey = process.env.IBM_WATSONX_APIKEY!;
      const projectId = process.env.IBM_WATSONX_PROJECT_ID || "";
      const watsonxUrl = process.env.IBM_WATSONX_URL || "https://us-south.ml.cloud.ibm.com";
      
      console.log(`Analyzing review with IBM Watsonx.ai for file ${fileName}...`);
      reviewerName = "IBM Watsonx (granite-20b-code-instruct)";
      rawResponse = await generateWatsonxReview(apiKey, projectId, watsonxUrl, compiledPrompt);
    } else {
      console.log(`Analyzing review with Gemini API fallback for file ${fileName}...`);
      reviewerName = "Gemini AI (gemini-3.5-flash)";
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: compiledPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              vulnerabilities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    severity: { type: Type.STRING },
                    pattern: { type: Type.STRING },
                    description: { type: Type.STRING },
                    line: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                  },
                  required: ["severity", "pattern", "description", "line", "recommendation"]
                }
              },
              optimizations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    benefit: { type: Type.STRING }
                  },
                  required: ["category", "issue", "suggestion", "benefit"]
                }
              },
              refactoredCode: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["summary", "refactoredCode", "explanation"]
          }
        }
      });
      rawResponse = response.text || "";
    }

    // 3. Clean and parse result format
    const parsedData = cleanAndParseJSON(rawResponse);

    // Return analyzed report details with meta information
    return res.json({
      reviewer: reviewerName,
      watsonx_active: useWatsonx,
      code_length: sourceCode.length,
      fileName,
      language: targetLanguage,
      report: parsedData,
    });

  } catch (error: any) {
    console.error("Endpoint review error:", error);
    return res.status(500).json({
      error: "Analysis Failed",
      message: error.message || "An unexpected error occurred during review analysis.",
    });
  }
});

// Configure Vite middleware or static server routing
const serveApp = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CodeCraft AI: Server running on http://localhost:${PORT}`);
  });
};

serveApp();
