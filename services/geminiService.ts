
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Initialize AI safely
try {
    // The API key is injected via environment variable
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
} catch (e) {
    console.warn("GoogleGenAI client could not be initialized (missing key?)", e);
}

// Simple in-memory cache to prevent re-generating summaries for the same items during a session
const summaryCache = new Map<string, string>();

export const generateTenderSummary = async (id: string, title: string, originalText: string): Promise<string | null> => {
  // If AI is not initialized (e.g. no key), return null silently so the UI uses the default text
  if (!ai) return null;

  // Return cached result if available
  if (summaryCache.has(id)) {
    return summaryCache.get(id)!;
  }

  try {
    const prompt = `Actúa como un experto en contratación pública. Analiza la siguiente licitación y genera un resumen EXTREMADAMENTE BREVE (máximo 2 líneas) explicando únicamente QUÉ producto, servicio u obra se busca contratar. 
    
    Instrucciones:
    - Sé directo y conciso.
    - Elimina códigos, IDs, referencias burocráticas y estado del expediente.
    - Céntrate en la oportunidad de negocio: ¿Qué se puede vender u ofrecer aquí?
    - No uses frases introductorias como "El objeto es" o "Se licita".

    Título: ${title}
    Descripción Original: ${originalText}
    
    Resumen breve:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text;
    if (text) {
        const cleanText = text.trim();
        summaryCache.set(id, cleanText);
        return cleanText;
    }
  } catch (error) {
    console.warn(`Error generating summary for tender ${id}:`, error);
  }

  return null;
};
