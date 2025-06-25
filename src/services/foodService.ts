import { OpenFoodFactsResponse, Product } from '../types';
import { analyzeIngredientsWithGemini } from './geminiService';

const API_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

// Ingredientes comúnmente no vegetarianos/veganos
const NON_VEGETARIAN_INGREDIENTS = [
  'carne', 'pollo', 'cerdo', 'pescado', 'mariscos', 'gelatina', 'cochinilla',
  'meat', 'chicken', 'pork', 'fish', 'seafood', 'gelatin', 'carmine',
  'beef', 'turkey', 'lamb', 'bacon', 'ham', 'anchovies', 'tuna',
  'ternera', 'cordero', 'jamón', 'anchoas', 'atún', 'bacalao'
];

const NON_VEGAN_INGREDIENTS = [
  ...NON_VEGETARIAN_INGREDIENTS,
  'leche', 'queso', 'mantequilla', 'huevo', 'miel', 'lactosa', 'caseína',
  'milk', 'cheese', 'butter', 'egg', 'honey', 'lactose', 'casein',
  'whey', 'cream', 'yogurt', 'suero', 'nata', 'yogur', 'requesón'
];

function analyzeIngredients(ingredientsText: string): { 
  classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown', 
  confidence: number 
} {
  if (!ingredientsText) {
    return { classification: 'unknown', confidence: 0 };
  }

  const lowerIngredients = ingredientsText.toLowerCase();
  
  // Buscar ingredientes no vegetarianos
  const hasNonVegetarian = NON_VEGETARIAN_INGREDIENTS.some(ingredient => 
    lowerIngredients.includes(ingredient)
  );
  
  if (hasNonVegetarian) {
    return { classification: 'omnivore', confidence: 90 };
  }
  
  // Buscar ingredientes no veganos (pero vegetarianos)
  const hasNonVegan = NON_VEGAN_INGREDIENTS.some(ingredient => 
    lowerIngredients.includes(ingredient)
  );
  
  if (hasNonVegan) {
    return { classification: 'vegetarian', confidence: 85 };
  }
  
  // Si no encontramos ingredientes problemáticos, probablemente es vegano
  // Pero con menos confianza si no tenemos análisis específico
  return { classification: 'vegan', confidence: 70 };
}

export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    console.log('🔍 Buscando producto con código:', barcode);
    
    const response = await fetch(`${API_BASE_URL}/${barcode}.json`);
    const data: OpenFoodFactsResponse = await response.json();
    
    if (data.status !== 1 || !data.product) {
      console.log('❌ Producto no encontrado en OpenFoodFacts');
      return null;
    }
    
    const product = data.product;
    const ingredientsText = product.ingredients_text_es || product.ingredients_text || '';
    
    console.log('📦 Producto encontrado:', product.product_name);
    console.log('🧪 Análisis disponible en OpenFoodFacts:', product.ingredients_analysis);
    
    // Variables para el análisis final
    let classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown' = 'unknown';
    let confidence = 0;
    let analysisSource = 'basic';
    let aiReasoning = '';
    let hasOpenFoodFactsData = false;
    
    // PRIORIDAD 1: Análisis de OpenFoodFacts (MÁXIMA PRIORIDAD)
    if (product.ingredients_analysis) {
      const analysis = product.ingredients_analysis;
      
      console.log('🎯 Revisando análisis de OpenFoodFacts:', {
        vegan: analysis['en:vegan'],
        vegetarian: analysis['en:vegetarian'],
        nonVegetarian: analysis['en:non-vegetarian'],
        nonVegan: analysis['en:non-vegan']
      });
      
      // Verificar si es vegano según OpenFoodFacts
      if (analysis['en:vegan']?.includes('yes')) {
        classification = 'vegan';
        confidence = 100;
        analysisSource = 'openfoodfacts';
        hasOpenFoodFactsData = true;
        console.log('✅ OpenFoodFacts: Producto es VEGANO (100%)');
      }
      // Verificar si es vegetariano según OpenFoodFacts
      else if (analysis['en:vegetarian']?.includes('yes')) {
        classification = 'vegetarian';
        confidence = 100;
        analysisSource = 'openfoodfacts';
        hasOpenFoodFactsData = true;
        console.log('✅ OpenFoodFacts: Producto es VEGETARIANO (100%)');
      }
      // Verificar si NO es vegetariano según OpenFoodFacts
      else if (analysis['en:non-vegetarian']?.includes('yes')) {
        classification = 'omnivore';
        confidence = 100;
        analysisSource = 'openfoodfacts';
        hasOpenFoodFactsData = true;
        console.log('✅ OpenFoodFacts: Producto es OMNÍVORO (100%)');
      }
      // Verificar si NO es vegano según OpenFoodFacts
      else if (analysis['en:non-vegan']?.includes('yes')) {
        // Si NO es vegano, pero no sabemos si es vegetariano, necesitamos más info
        if (!analysis['en:vegetarian'] || analysis['en:vegetarian'].includes('unknown')) {
          // Usar análisis básico o IA para determinar si es vegetariano
          console.log('⚠️ OpenFoodFacts: NO es vegano, pero vegetariano incierto');
        } else if (analysis['en:vegetarian']?.includes('yes')) {
          classification = 'vegetarian';
          confidence = 100;
          analysisSource = 'openfoodfacts';
          hasOpenFoodFactsData = true;
          console.log('✅ OpenFoodFacts: NO es vegano pero SÍ es VEGETARIANO (100%)');
        }
      }
    }
    
    // PRIORIDAD 2: Solo usar IA si OpenFoodFacts NO tiene información clara
    if (!hasOpenFoodFactsData && ingredientsText.trim()) {
      console.log('🤖 OpenFoodFacts sin datos claros, usando análisis de Gemini');
      
      try {
        const geminiAnalysis = await analyzeIngredientsWithGemini(ingredientsText);
        
        if (geminiAnalysis.classification !== 'unknown') {
          classification = geminiAnalysis.classification;
          confidence = geminiAnalysis.confidence;
          analysisSource = 'gemini';
          aiReasoning = geminiAnalysis.reasoning;
          console.log('🧠 Análisis de Gemini:', geminiAnalysis);
        }
      } catch (error) {
        console.error('❌ Error en análisis de Gemini:', error);
        // PRIORIDAD 3: Análisis básico como último recurso
        const basicAnalysis = analyzeIngredients(ingredientsText);
        classification = basicAnalysis.classification;
        confidence = basicAnalysis.confidence;
        analysisSource = 'basic';
        console.log('🔧 Usando análisis básico:', basicAnalysis);
      }
    }
    
    // PRIORIDAD 3: Análisis básico si no hay ingredientes
    if (!hasOpenFoodFactsData && !ingredientsText.trim()) {
      const basicAnalysis = analyzeIngredients(ingredientsText);
      classification = basicAnalysis.classification;
      confidence = basicAnalysis.confidence;
      analysisSource = 'basic';
      console.log('📝 Sin ingredientes, usando análisis básico:', basicAnalysis);
    }
    
    console.log(`🎉 RESULTADO FINAL: ${classification.toUpperCase()} (${confidence}% confianza) - Fuente: ${analysisSource}`);
    
    return {
      id: product._id,
      code: product.code,
      product_name: product.product_name || 'Producto sin nombre',
      brands: product.brands || '',
      categories: product.categories || '',
      ingredients_text: ingredientsText,
      allergens: product.allergens || '',
      nutrition_grades: product.nutrition_grades || '',
      image_url: product.image_url || '',
      image_front_url: product.image_front_url || '',
      vegetarian: classification === 'vegetarian' || classification === 'vegan',
      vegan: classification === 'vegan',
      classification,
      confidence,
      analysisSource,
      aiReasoning,
      scanned_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    throw new Error('Error al buscar el producto. Verifica tu conexión a internet.');
  }
}