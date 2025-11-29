import { GoogleGenAI, Type } from "@google/genai";
import { Suggestion, SourceMatch, AiDetectionResult, VerificationResult } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const checkGrammarAndStyle = async (text: string): Promise<Suggestion[]> => {
  const ai = getAiClient();
  
  const systemInstruction = `You are a world-class editor for academic and professional writing. 
  Analyze the provided text for grammar errors, spelling mistakes, awkward phrasing, and clarity issues.
  Return a strictly structured JSON response. 
  Focus on high-value improvements. If the text is perfect, return an empty array.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: text,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING, description: "The exact sentence or phrase from the source text that needs improvement." },
            suggestedText: { type: Type.STRING, description: "The improved version of the text." },
            explanation: { type: Type.STRING, description: "A concise reason for the change." },
            type: { type: Type.STRING, enum: ["Grammar", "Spelling", "Style", "Clarity"] },
            severity: { type: Type.STRING, enum: ["Critical", "Major", "Minor"] }
          },
          required: ["originalText", "suggestedText", "explanation", "type", "severity"]
        }
      }
    }
  });

  if (response.text) {
    try {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({ ...item, id: `suggestion-${index}-${Date.now()}` }));
    } catch (e) {
      console.error("Failed to parse grammar response", e);
      return [];
    }
  }
  return [];
};

export const verifySources = async (text: string): Promise<SourceMatch[]> => {
  const ai = getAiClient();
  
  // We use the search tool to find corroborating sources or check for existing content
  const prompt = `Perform a search to verify the claims or text segments in the following content. 
  Identify the most relevant external sources that discuss similar topics or contain similar text.
  Text to check: 
  "${text.substring(0, 1000)}" 
  (Truncated for search efficiency if too long)`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const sources: SourceMatch[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          url: chunk.web.uri,
          title: chunk.web.title || "External Source",
        });
      }
    });
  }

  // Remove duplicates based on URL
  const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
  return uniqueSources;
};

export const verifyTextClaims = async (text: string): Promise<VerificationResult[]> => {
  const ai = getAiClient();
  
  const prompt = `
  Analyze the credibility of the following text segment.
  1. Break it down into distinct factual claims.
  2. Use Google Search to verify each claim.
  3. Return a JSON array where each item represents a claim and its verification status.
  
  Text to verify: "${text}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            claim: { type: Type.STRING, description: "The specific claim extracted from the text." },
            status: { type: Type.STRING, enum: ["Verified", "Questionable", "False", "Unverifiable"] },
            explanation: { type: Type.STRING, description: "A brief explanation of the findings based on search results." },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            }
          },
          required: ["claim", "status", "explanation", "sources"]
        }
      }
    }
  });

  if (response.text) {
    try {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({ ...item, id: `claim-${index}-${Date.now()}` }));
    } catch (e) {
      console.error("Failed to parse verification response", e);
      return [];
    }
  }
  return [];
};

export const generateSummary = async (text: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Provide a concise, academic abstract-style summary of the following text:\n\n${text}`,
  });
  return response.text || "Could not generate summary.";
};

export const detectAIContent = async (text: string): Promise<AiDetectionResult> => {
  const ai = getAiClient();
  const prompt = `Analyze the following text for linguistic patterns typical of AI-generated content (e.g., lack of perplexity, repetitive sentence structures, overuse of transitional phrases, perfect but soulless grammar).
  
  Provide an assessment in JSON format with:
  1. score (0-100, where 100 is definitely AI)
  2. label ("Likely Human", "Mixed Signals", "Likely AI-Generated")
  3. explanation (A brief 1-2 sentence reason).

  Text: "${text.substring(0, 2000)}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          label: { type: Type.STRING, enum: ["Likely Human", "Mixed Signals", "Likely AI-Generated"] },
          explanation: { type: Type.STRING }
        },
        required: ["score", "label", "explanation"]
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(response.text) as AiDetectionResult;
    } catch (e) {
      console.error("Failed to parse AI detection response", e);
    }
  }
  
  return { score: 0, label: "Likely Human", explanation: "Could not analyze." };
};

export const extractTextFromFile = async (fileBase64: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  
  // Use multimodal capabilities to read the document
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64
          }
        },
        {
          text: "Please transcribe the full text content of this document exactly as it appears. Do not summarize. Return only the text."
        }
      ]
    }
  });

  return response.text || "";
};