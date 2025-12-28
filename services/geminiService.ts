
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult } from "../types";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

export const searchLocations = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY or API_KEY for location search.');
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for geographical locations (cities, villages, landmarks) matching: "${query}". Return the most likely candidates with their coordinates and country.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              description: { type: Type.STRING },
              country: { type: Type.STRING },
            },
            required: ["name", "lat", "lng", "country"],
          },
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
};
