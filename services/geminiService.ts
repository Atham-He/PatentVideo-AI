
import { GoogleGenAI, Type } from "@google/genai";
import { PatentAnalysis, LegalAnalysis } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const identifyPatentFigures = async (images: string[]): Promise<number[]> => {
  const ai = getAI();
  // Use Flash for fast image classification
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          ...images.map(img => ({
            inlineData: {
              data: img.split(',')[1],
              mimeType: 'image/jpeg'
            }
          })),
          { 
            text: `Look at these patent pages. Return a JSON object with a list of indices (0-based) corresponding to pages that contain VISUAL TECHNICAL DRAWINGS or FIGURES. Ignore pages that are purely text.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          figureIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } }
        }
      }
    }
  });
  
  const result = JSON.parse(response.text);
  return result.figureIndices || [];
};

export const performLegalAnalysis = async (images: string[]): Promise<LegalAnalysis> => {
  const ai = getAI();
  
  // Use Pro for complex legal reasoning
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        parts: [
          // We assume the first few images contain the claims/text, or we pass all images. 
          // For bandwidth, we'll pass the first 5 pages which usually have text, plus figure pages.
          ...images.slice(0, 5).map(img => ({
            inlineData: {
              data: img.split(',')[1],
              mimeType: 'image/jpeg'
            }
          })),
          { 
            text: `Analyze the patent claims and description. 
            Identify which specific physical parts of the structure are legally PROTECTED (cannot be plagiarized) and which parts are generic/prior art/unprotected (safe to use).
            Provide a short risk assessment summary.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          protectedParts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of parts covered by claims (High Infringement Risk)"
          },
          unprotectedParts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of parts that are generic or not claimed (Low Risk)"
          },
          riskAssessment: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export const analyzePatent = async (images: string[]): Promise<PatentAnalysis> => {
  const ai = getAI();
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        parts: [
          ...images.map(img => ({
            inlineData: {
              data: img.split(',')[1],
              mimeType: 'image/jpeg'
            }
          })),
          { 
            text: `Analyze this American patent document. 
            1. Extract metadata.
            2. Identify Core Innovation.
            3. Describe structure.
            4. Create a Veo-3.1 video prompt.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          patentNumber: { type: Type.STRING },
          inventors: { type: Type.ARRAY, items: { type: Type.STRING } },
          abstract: { type: Type.STRING },
          keyComponents: { type: Type.ARRAY, items: { type: Type.STRING } },
          structuralDescription: { type: Type.STRING },
          coreInnovation: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        },
        required: ["title", "patentNumber", "inventors", "abstract", "keyComponents", "structuralDescription", "coreInnovation", "visualPrompt"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateStructuralVideo = async (prompt: string): Promise<string> => {
  const ai = getAI();

  console.log("Initializing Veo Video Generation...");
  console.log("Prompt:", prompt);

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  console.log("Veo Operation Started:", operation.name);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    console.log("Veo Polling Status:", operation.metadata?.state || "Processing...");
  }

  // 1. Check for explicit API errors in the operation result
  if (operation.error) {
    const errorMsg = operation.error.message || JSON.stringify(operation.error);
    console.error("Veo Operation Failed:", errorMsg);
    throw new Error(`Veo Generation Failed: ${errorMsg}`);
  }

  // 2. Check for successful response and URI existence
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!downloadLink) {
    console.error("Veo Operation Completed but URI is missing. Full Op:", operation);
    throw new Error("Video generation completed, but no video link was returned. The prompt might have been filtered or the service is experiencing issues.");
  }

  console.log("Veo Generation Successful. Fetching video bytes...");

  // 3. Download the video content
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch video file: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
