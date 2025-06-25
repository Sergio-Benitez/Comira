interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface IngredientAnalysis {
  classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown';
  confidence: number;
  reasoning: string;
}

const GEMINI_API_KEY = 'AIzaSyDkpz2TbZC7Iaaq3CeiVP5P1x3OZSOIHgg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const ANALYSIS_PROMPT = `
Eres un experto en análisis de ingredientes alimentarios. Tu tarea es determinar si un producto es vegano, vegetariano o contiene productos animales basándote en su lista de ingredientes.

Definiciones:
- VEGANO: No contiene ningún ingrediente de origen animal (carne, pescado, lácteos, huevos, miel, gelatina, etc.)
- VEGETARIANO: No contiene carne ni pescado, pero puede contener lácteos, huevos o miel
- OMNÍVORO: Contiene carne, pescado o derivados de estos

Analiza los siguientes ingredientes y responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "classification": "vegan|vegetarian|omnivore|unknown",
  "confidence": número_entre_0_y_100,
  "reasoning": "explicación_breve_del_análisis"
}

Ingredientes a analizar:
`;

export async function analyzeIngredientsWithGemini(ingredients: string): Promise<IngredientAnalysis> {
  if (!ingredients || ingredients.trim().length === 0) {
    return {
      classification: 'unknown',
      confidence: 0,
      reasoning: 'No hay ingredientes para analizar'
    };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: ANALYSIS_PROMPT + ingredients
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 500,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Error de API de Gemini: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No se recibió respuesta de Gemini');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // Extraer JSON de la respuesta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Respuesta de Gemini no contiene JSON válido');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validar la respuesta
    if (!analysis.classification || !['vegan', 'vegetarian', 'omnivore', 'unknown'].includes(analysis.classification)) {
      throw new Error('Clasificación inválida de Gemini');
    }

    return {
      classification: analysis.classification,
      confidence: Math.min(Math.max(analysis.confidence || 0, 0), 100),
      reasoning: analysis.reasoning || 'Análisis completado'
    };

  } catch (error) {
    console.error('Error al analizar ingredientes con Gemini:', error);
    
    // Fallback a análisis básico
    return {
      classification: 'unknown',
      confidence: 0,
      reasoning: `Error en análisis IA: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}