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
  confidenceExplanation?: string;
}

interface TranslationResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const ANALYSIS_PROMPT = `
Eres un experto en análisis de ingredientes alimentarios. Tu tarea es determinar si un producto es vegano, vegetariano o contiene productos animales basándote en su lista de ingredientes.

IMPORTANTE: Responde SIEMPRE en español, sin importar el idioma de los ingredientes. Si los ingredientes están en otro idioma, tradúcelos mentalmente al español para tu análisis.

Definiciones:
- VEGANO: No contiene ningún ingrediente de origen animal (carne, pescado, lácteos, huevos, miel, gelatina, etc.)
- VEGETARIANO: No contiene carne ni pescado, pero puede contener lácteos, huevos o miel
- OMNÍVORO: Contiene carne, pescado o derivados de estos

Si tu confianza no es del 100%, explica específicamente por qué tienes dudas en el campo "confidenceExplanation". Por ejemplo:
- Si hay ingredientes ambiguos o poco claros
- Si faltan detalles sobre el origen de ciertos ingredientes
- Si hay términos técnicos que podrían tener múltiples interpretaciones

Analiza los siguientes ingredientes y responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "classification": "vegan|vegetarian|omnivore|unknown",
  "confidence": número_entre_0_y_100,
  "reasoning": "explicación_breve_del_análisis_en_español",
  "confidenceExplanation": "explicación_específica_de_por_qué_no_es_100%_confianza_si_aplica"
}

Ingredientes a analizar:
`;

const TRANSLATION_PROMPT = `
Eres un traductor especializado en ingredientes alimentarios. Tu tarea es traducir la siguiente lista de ingredientes al español de manera precisa y comprensible.

INSTRUCCIONES CRÍTICAS:
- Traduce TODO al español, incluso si algunos ingredientes ya están en español
- Mantén los nombres técnicos cuando sea apropiado, pero hazlos comprensibles
- Conserva el formato original (comas, paréntesis, puntos, etc.)
- Para ingredientes muy técnicos, usa el nombre en español más común
- Si un ingrediente no tiene traducción directa, explícalo brevemente en español
- NUNCA devuelvas texto en inglés

EJEMPLOS:
- "Water, sugar, wheat flour" → "Agua, azúcar, harina de trigo"
- "Milk powder, cocoa" → "Leche en polvo, cacao"
- "E330 (citric acid)" → "E330 (ácido cítrico)"
- "Rehydrated skimmed lactose-free milk" → "Leche desnatada rehidratada sin lactosa"

Responde ÚNICAMENTE con la traducción completa, sin explicaciones adicionales.

Lista de ingredientes a traducir:
`;

// Helper function to handle rate limiting with exponential backoff
async function makeGeminiRequest(prompt: string, maxRetries: number = 3): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('API key de Gemini no configurada. Por favor, configura VITE_GEMINI_API_KEY en tu archivo .env');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Rate limit alcanzado. Reintentando en ${waitTime/1000} segundos... (Intento ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error('Límite de solicitudes excedido. Por favor, intenta más tarde o verifica tu cuota de API de Gemini.');
        }
      }

      if (!response.ok) {
        throw new Error(`Error de API de Gemini: ${response.status} - ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const waitTime = 1000 * attempt;
      console.warn(`⚠️ Error en solicitud a Gemini. Reintentando en ${waitTime/1000} segundos... (Intento ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

export async function translateIngredients(ingredients: string): Promise<string> {
  if (!ingredients || ingredients.trim().length === 0) {
    console.log('🌍 No hay ingredientes para traducir');
    return ingredients;
  }

  // Detectar si contiene palabras en inglés
  const englishWords = [
    'water', 'sugar', 'flour', 'milk', 'egg', 'butter', 'oil', 'salt', 'wheat', 'corn', 'soy', 
    'contains', 'may contain', 'ingredients', 'natural flavor', 'artificial flavor', 'preservative', 
    'emulsifier', 'stabilizer', 'antioxidant', 'color', 'colour', 'vitamin', 'mineral',
    'rehydrated', 'skimmed', 'lactose-free', 'vanilla', 'essence', 'inulin', 'prebiotic', 
    'natural', 'fibre', 'fiber', 'maltodextrin', 'sweeteners', 'free', 'powder', 'extract', 
    'concentrate', 'modified', 'starch', 'and', 'or', 'with', 'from', 'added', 'less', 'than'
  ];
  
  const lowerIngredients = ingredients.toLowerCase();
  const hasEnglishWords = englishWords.some(word => lowerIngredients.includes(word));
  
  console.log('🌍 Detectando idioma de ingredientes...');
  console.log('📝 Ingredientes originales:', ingredients.substring(0, 100) + '...');
  console.log('🔍 ¿Contiene palabras en inglés?', hasEnglishWords);
  
  if (!hasEnglishWords) {
    console.log('✅ Los ingredientes parecen estar ya en español');
    return ingredients;
  }

  try {
    console.log('🤖 Enviando ingredientes a Gemini para traducir...');
    
    const data: TranslationResponse = await makeGeminiRequest(TRANSLATION_PROMPT + ingredients);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.warn('⚠️ No se recibió traducción de Gemini, usando ingredientes originales');
      return ingredients;
    }

    const translatedText = data.candidates[0].content.parts[0].text.trim();
    
    if (!translatedText || translatedText === ingredients) {
      console.warn('⚠️ La traducción está vacía o es igual al original');
      return ingredients;
    }
    
    console.log('✅ Ingredientes traducidos exitosamente');
    console.log('📝 Traducción:', translatedText.substring(0, 100) + '...');
    
    return translatedText;

  } catch (error) {
    console.error('❌ Error al traducir ingredientes:', error);
    console.warn('⚠️ Usando ingredientes originales sin traducir');
    return ingredients;
  }
}

export async function analyzeIngredientsWithGemini(ingredients: string): Promise<IngredientAnalysis> {
  if (!ingredients || ingredients.trim().length === 0) {
    return {
      classification: 'unknown',
      confidence: 0,
      reasoning: 'No hay ingredientes para analizar',
      confidenceExplanation: 'No se proporcionaron ingredientes para el análisis'
    };
  }

  try {
    const data: GeminiResponse = await makeGeminiRequest(ANALYSIS_PROMPT + ingredients);
    
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
      reasoning: analysis.reasoning || 'Análisis completado',
      confidenceExplanation: analysis.confidenceExplanation
    };

  } catch (error) {
    console.error('Error al analizar ingredientes con Gemini:', error);
    
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {
      if (error.message.includes('Límite de solicitudes excedido')) {
        errorMessage = 'Límite de solicitudes de IA excedido. Intenta más tarde.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'Configuración de API de IA requerida';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      classification: 'unknown',
      confidence: 0,
      reasoning: `Error en análisis IA: ${errorMessage}`,
      confidenceExplanation: 'No se pudo completar el análisis debido a un error técnico'
    };
  }
}