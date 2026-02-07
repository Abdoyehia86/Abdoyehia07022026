
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

const MODEL_NAME = 'gemini-3-pro-preview';

export const processPartWithGemini = async (part: string, website: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Find information for the electronic component part number "${part}" on the website "${website}".
    
    You must find:
    1. The direct product page URL on ${website}.
    2. The current lifecycle status (e.g., Active, Obsolete, NRND, EOL). If not explicitly found, look for "In Stock" or "Discontinued" cues.
    3. The direct URL to the technical datasheet for this specific part.
    
    If any information is not found, use "Not found" as the value.
    Return the result strictly in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            link: { 
              type: Type.STRING, 
              description: "The product page URL address link. Use 'Not found' if unavailable." 
            },
            lifecycle: { 
              type: Type.STRING, 
              description: "The lifecycle status word found on the page. Use 'Not found' if unavailable." 
            },
            datasheet: { 
              type: Type.STRING, 
              description: "The datasheet URL address link. Use 'Not found' if unavailable." 
            },
          },
          required: ["link", "lifecycle", "datasheet"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text.trim()) as GeminiResponse;
  } catch (error) {
    console.error(`Error processing part ${part}:`, error);
    return {
      link: "Not found",
      lifecycle: "Not found",
      datasheet: "Not found"
    };
  }
};
