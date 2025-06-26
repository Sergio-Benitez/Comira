import { OpenFoodFactsResponse, Product } from '../types';
import { analyzeIngredientsWithGemini, translateIngredients } from './geminiService';

const API_BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';

// Ingredientes comúnmente no vegetarianos/veganos para análisis básico
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

/**
 * ANÁLISIS BÁSICO
 */
function basicIngredientAnalysis(ingredientsText: string): { 
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
  
  // Buscar ingredientes no veganos
  const hasNonVegan = NON_VEGAN_INGREDIENTS.some(ingredient => 
    lowerIngredients.includes(ingredient)
  );
  
  if (hasNonVegan) {
    return { classification: 'vegetarian', confidence: 85 };
  }
  
  return { classification: 'vegan', confidence: 70 };
}

/**
 * ANÁLISIS CONSERVADOR DE OPENFOODFACTS
 */
function analyzeOpenFoodFactsData(product: any): {
  classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown';
  confidence: number;
  source: 'openfoodfacts' | 'none';
} {
  console.log('\n🔍 ===== ANÁLISIS OPENFOODFACTS CONSERVADOR =====');
  console.log('📦 Producto:', product.product_name, '(', product.code, ')');
  
  // ==========================================
  // MÉTODO 1: INGREDIENTS_ANALYSIS_TAGS (PRIORITARIO)
  // ==========================================
  if (Array.isArray(product.ingredients_analysis_tags)) {
    console.log('\n🏷️ ANÁLISIS DE INGREDIENTS_ANALYSIS_TAGS:');
    console.log('📋 Tags encontrados:', product.ingredients_analysis_tags);
    
    const tags = product.ingredients_analysis_tags;
    
    // Buscar tags específicos
    const hasVeganTag = tags.includes('en:vegan');
    const hasVegetarianTag = tags.includes('en:vegetarian');
    const hasNonVeganTag = tags.includes('en:non-vegan');
    const hasNonVegetarianTag = tags.includes('en:non-vegetarian');
    
    console.log('🔍 Análisis de tags:');
    console.log('  - en:vegan:', hasVeganTag);
    console.log('  - en:vegetarian:', hasVegetarianTag);
    console.log('  - en:non-vegan:', hasNonVeganTag);
    console.log('  - en:non-vegetarian:', hasNonVegetarianTag);
    
    // ==========================================
    // LÓGICA CONSERVADORA - SOLO CLASIFICAR SI ESTAMOS SEGUROS
    // ==========================================
    
    // 1. MÁXIMA PRIORIDAD: ¿Contiene carne/pescado? → OMNÍVORO
    if (hasNonVegetarianTag) {
      console.log('🥩 RESULTADO TAGS: OMNÍVORO (en:non-vegetarian - contiene carne/pescado)');
      return { classification: 'omnivore', confidence: 100, source: 'openfoodfacts' };
    }
    
    // 2. SEGUNDA PRIORIDAD: ¿Es explícitamente vegano? → VEGANO
    if (hasVeganTag) {
      console.log('🌱 RESULTADO TAGS: VEGANO (en:vegan)');
      return { classification: 'vegan', confidence: 100, source: 'openfoodfacts' };
    }
    
    // 3. TERCERA PRIORIDAD: ¿Es explícitamente vegetariano Y sabemos que no es vegano? → VEGETARIANO
    if (hasVegetarianTag && hasNonVeganTag) {
      console.log('🥛 RESULTADO TAGS: VEGETARIANO (en:vegetarian + en:non-vegan - confirmado)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    }
    
    // 4. CUARTA PRIORIDAD: ¿Es solo vegetariano sin información contradictoria? → VEGETARIANO
    if (hasVegetarianTag && !hasNonVeganTag && !hasVeganTag) {
      console.log('🥛 RESULTADO TAGS: VEGETARIANO (en:vegetarian sin contradicciones)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    }
    
    // ==========================================
    // CAMBIO CRÍTICO: SER MÁS CONSERVADOR
    // ==========================================
    
    // 5. NUEVA REGLA: Si solo sabemos que NO es vegano, pero NO sabemos si es vegetariano → DESCONOCIDO
    // Esto cubre casos como el helado donde OpenFoodFacts dice "No vegano" pero "Se desconoce si es vegetariano"
    if (hasNonVeganTag && !hasVegetarianTag && !hasNonVegetarianTag) {
      console.log('❓ RESULTADO TAGS: DESCONOCIDO (en:non-vegan pero sin confirmación vegetariana)');
      console.log('   → OpenFoodFacts no está seguro si es vegetariano, delegando a IA');
      return { classification: 'unknown', confidence: 0, source: 'none' };
    }
    
    // Si hay tags pero ninguno es concluyente
    if (tags.length > 0) {
      console.log('⚠️ Hay tags pero ninguno permite clasificación definitiva');
      console.log('   → Delegando a análisis de IA para mayor precisión');
      return { classification: 'unknown', confidence: 0, source: 'none' };
    }
  }
  
  // ==========================================
  // MÉTODO 2: CAMPOS DIRECTOS
  // ==========================================
  const directVegetarian = product.vegetarian;
  const directVegan = product.vegan;
  
  console.log('\n🔍 Campos directos:');
  console.log('  - vegetarian:', directVegetarian);
  console.log('  - vegan:', directVegan);
  
  if (directVegan === '1' || directVegan === 'yes' || directVegan === 1) {
    console.log('🌱 RESULTADO CAMPOS: VEGANO (campo directo vegan=yes)');
    return { classification: 'vegan', confidence: 100, source: 'openfoodfacts' };
  }
  
  if (directVegetarian === '1' || directVegetarian === 'yes' || directVegetarian === 1) {
    if (directVegan === '0' || directVegan === 'no' || directVegan === 0) {
      console.log('🥛 RESULTADO CAMPOS: VEGETARIANO (vegetarian=yes, vegan=no)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    } else {
      console.log('🥛 RESULTADO CAMPOS: VEGETARIANO (vegetarian=yes, sin info vegana)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    }
  }
  
  if (directVegetarian === '0' || directVegetarian === 'no' || directVegetarian === 0) {
    console.log('🥩 RESULTADO CAMPOS: OMNÍVORO (vegetarian=no)');
    return { classification: 'omnivore', confidence: 100, source: 'openfoodfacts' };
  }
  
  // ==========================================
  // MÉTODO 3: INGREDIENTS_ANALYSIS (FALLBACK)
  // ==========================================
  if (product.ingredients_analysis && typeof product.ingredients_analysis === 'object') {
    console.log('\n📊 ANÁLISIS DE INGREDIENTS_ANALYSIS:');
    const analysis = product.ingredients_analysis;
    
    const vegan = Array.isArray(analysis['en:vegan']) ? analysis['en:vegan'] : [];
    const vegetarian = Array.isArray(analysis['en:vegetarian']) ? analysis['en:vegetarian'] : [];
    const nonVegan = Array.isArray(analysis['en:non-vegan']) ? analysis['en:non-vegan'] : [];
    const nonVegetarian = Array.isArray(analysis['en:non-vegetarian']) ? analysis['en:non-vegetarian'] : [];

    console.log('  - en:vegan:', vegan);
    console.log('  - en:vegetarian:', vegetarian);
    console.log('  - en:non-vegan:', nonVegan);
    console.log('  - en:non-vegetarian:', nonVegetarian);

    // Aplicar la misma lógica conservadora
    if (nonVegetarian.includes('yes')) {
      console.log('🥩 RESULTADO ANALYSIS: OMNÍVORO (en:non-vegetarian=yes)');
      return { classification: 'omnivore', confidence: 100, source: 'openfoodfacts' };
    }

    if (vegan.includes('yes')) {
      console.log('🌱 RESULTADO ANALYSIS: VEGANO (en:vegan=yes)');
      return { classification: 'vegan', confidence: 100, source: 'openfoodfacts' };
    }

    if (vegetarian.includes('yes') && nonVegan.includes('yes')) {
      console.log('🥛 RESULTADO ANALYSIS: VEGETARIANO (en:vegetarian=yes + en:non-vegan=yes)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    }

    if (vegetarian.includes('yes') && vegan.length === 0 && nonVegan.length === 0) {
      console.log('🥛 RESULTADO ANALYSIS: VEGETARIANO (en:vegetarian=yes, sin contradicciones)');
      return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
    }

    // NUEVA REGLA CONSERVADORA: Si solo sabemos que NO es vegano → DESCONOCIDO
    if (nonVegan.includes('yes') && vegetarian.length === 0 && !nonVegetarian.includes('yes')) {
      console.log('❓ RESULTADO ANALYSIS: DESCONOCIDO (en:non-vegan=yes pero sin confirmación vegetariana)');
      return { classification: 'unknown', confidence: 0, source: 'none' };
    }

    if (vegetarian.includes('no')) {
      console.log('🥩 RESULTADO ANALYSIS: OMNÍVORO (en:vegetarian=no)');
      return { classification: 'omnivore', confidence: 100, source: 'openfoodfacts' };
    }

    if (vegan.includes('no') && !vegetarian.includes('no') && !nonVegetarian.includes('yes')) {
      // Solo si tenemos confirmación positiva de que es vegetariano
      if (vegetarian.includes('yes')) {
        console.log('🥛 RESULTADO ANALYSIS: VEGETARIANO (en:vegan=no + en:vegetarian=yes)');
        return { classification: 'vegetarian', confidence: 100, source: 'openfoodfacts' };
      } else {
        console.log('❓ RESULTADO ANALYSIS: DESCONOCIDO (en:vegan=no pero sin confirmación vegetariana)');
        return { classification: 'unknown', confidence: 0, source: 'none' };
      }
    }
  }

  console.log('\n❌ NO HAY DATOS CONCLUYENTES EN OPENFOODFACTS');
  return { classification: 'unknown', confidence: 0, source: 'none' };
}

/**
 * Detecta si los ingredientes necesitan traducción - MEJORADO Y MÁS AGRESIVO
 */
function needsTranslation(ingredients: string): boolean {
  if (!ingredients || ingredients.trim().length === 0) {
    return false;
  }

  // Lista muy ampliada de palabras comunes en inglés en ingredientes
  const englishWords = [
    // Básicos
    'water', 'sugar', 'flour', 'milk', 'egg', 'butter', 'oil', 'salt', 
    'wheat', 'corn', 'soy', 'contains', 'may contain', 'ingredients',
    
    // Sabores y aditivos
    'natural flavor', 'artificial flavor', 'preservative', 'emulsifier',
    'stabilizer', 'antioxidant', 'color', 'colour', 'vitamin', 'mineral',
    
    // Específicos de lácteos y procesados
    'rehydrated', 'skimmed', 'lactose-free', 'vanilla', 'essence', 'inulin',
    'prebiotic', 'natural', 'fibre', 'fiber', 'maltodextrin', 'sweeteners',
    'free', 'powder', 'extract', 'concentrate', 'modified', 'starch',
    
    // Nuevas palabras detectadas
    'and', 'or', 'with', 'from', 'added', 'less', 'than', 'more',
    'organic', 'natural', 'artificial', 'synthetic', 'derived',
    'citric', 'acid', 'sodium', 'potassium', 'calcium', 'magnesium',
    'mono', 'di', 'tri', 'glycerides', 'lecithin', 'carrageenan',
    'guar', 'gum', 'xanthan', 'pectin', 'agar', 'gellan',
    'ascorbic', 'tocopherol', 'beta', 'carotene', 'riboflavin',
    'thiamine', 'niacin', 'folate', 'biotin', 'pantothenic',
    'pyridoxine', 'cobalamin', 'cholecalciferol', 'phylloquinone'
  ];
  
  const lowerIngredients = ingredients.toLowerCase();
  const englishWordsFound = englishWords.filter(word => lowerIngredients.includes(word)).length;
  
  // Ser MUY agresivo con la detección - solo 1 palabra es suficiente
  console.log(`🌍 Detección de idioma: ${englishWordsFound} palabras en inglés encontradas`);
  console.log(`📝 Muestra de ingredientes: "${ingredients.substring(0, 100)}..."`);
  
  // Si encuentra al menos 1 palabra en inglés, traducir
  const shouldTranslate = englishWordsFound >= 1;
  console.log(`🔄 ¿Necesita traducción? ${shouldTranslate ? 'SÍ' : 'NO'}`);
  
  return shouldTranslate;
}

/**
 * Validar código de barras antes de hacer la petición
 */
function validateBarcodeFormat(barcode: string): { isValid: boolean; error?: string } {
  const trimmedCode = barcode.trim();
  
  if (!trimmedCode) {
    return { isValid: false, error: 'Código de barras vacío' };
  }
  
  if (trimmedCode.length < 8 || trimmedCode.length > 14) {
    return { isValid: false, error: 'El código debe tener entre 8 y 14 dígitos' };
  }
  
  if (!/^\d+$/.test(trimmedCode)) {
    return { isValid: false, error: 'El código solo puede contener números' };
  }
  
  const suspiciousPatterns = [
    'http', 'https', 'www', '.com', '.js', 'error', 'failed', 'cannot',
    'localservice', 'webcontainer', 'TypeError', 'navigate', 'console',
    'react-dom', 'lucid', 'sentry', 'download'
  ];
  
  const lowerCode = trimmedCode.toLowerCase();
  for (const pattern of suspiciousPatterns) {
    if (lowerCode.includes(pattern)) {
      return { isValid: false, error: 'Formato de código inválido detectado' };
    }
  }
  
  return { isValid: true };
}

/**
 * FUNCIÓN PRINCIPAL DE ANÁLISIS
 */
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    console.log('\n🚀 ===== INICIANDO BÚSQUEDA =====');
    console.log('🔍 Código de barras recibido:', barcode);
    
    const validation = validateBarcodeFormat(barcode);
    if (!validation.isValid) {
      console.error('❌ Código de barras inválido:', validation.error);
      throw new Error(`Código de barras inválido: ${validation.error}`);
    }
    
    const cleanBarcode = barcode.trim();
    console.log('✅ Código validado:', cleanBarcode);
    
    const response = await fetch(`${API_BASE_URL}/${cleanBarcode}.json`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: OpenFoodFactsResponse = await response.json();
    
    if (data.status !== 1 || !data.product) {
      console.log('❌ Producto no encontrado en OpenFoodFacts');
      return null;
    }
    
    const product = data.product;
    let ingredientsText = product.ingredients_text_es || product.ingredients_text || '';
    
    console.log('✅ Producto encontrado:', product.product_name);
    console.log('📝 Ingredientes originales:', ingredientsText.substring(0, 100) + '...');
    
    // Variables para el resultado final
    let classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown' = 'unknown';
    let confidence = 0;
    let analysisSource: 'openfoodfacts' | 'gemini' | 'basic' = 'basic';
    let aiReasoning = '';
    let confidenceExplanation = '';

    // ==========================================
    // PASO 1: OPENFOODFACTS (PRIORIDAD ABSOLUTA)
    // ==========================================
    const openFoodFactsResult = analyzeOpenFoodFactsData(product);
    
    if (openFoodFactsResult.source === 'openfoodfacts') {
      // ✅ USAR OPENFOODFACTS - RESULTADO FINAL
      classification = openFoodFactsResult.classification;
      confidence = openFoodFactsResult.confidence;
      analysisSource = 'openfoodfacts';
      confidenceExplanation = '';
      
      console.log(`\n🎉 RESULTADO FINAL OPENFOODFACTS: ${classification.toUpperCase()} (${confidence}%)`);
      
      // TRADUCIR INGREDIENTES SIEMPRE QUE SEA NECESARIO
      if (ingredientsText.trim() && needsTranslation(ingredientsText)) {
        try {
          console.log('🌍 Traduciendo ingredientes para mostrar (resultado OpenFoodFacts)...');
          const translatedIngredients = await translateIngredients(ingredientsText);
          if (translatedIngredients && translatedIngredients !== ingredientsText) {
            console.log('✅ Ingredientes traducidos exitosamente');
            console.log('📝 Antes:', ingredientsText.substring(0, 50) + '...');
            console.log('📝 Después:', translatedIngredients.substring(0, 50) + '...');
            ingredientsText = translatedIngredients;
          } else {
            console.log('⚠️ La traducción no cambió el texto o falló silenciosamente');
          }
        } catch (error) {
          console.error('❌ Error al traducir ingredientes:', error);
          console.log('⚠️ Usando ingredientes originales sin traducir');
        }
      } else {
        console.log('ℹ️ Los ingredientes no necesitan traducción o están vacíos');
      }
    } else {
      // ==========================================
      // OPENFOODFACTS NO TIENE DATOS ÚTILES O ES AMBIGUO
      // ==========================================
      console.log('\n❌ OpenFoodFacts no tiene datos concluyentes - Delegando a IA');
      
      // ==========================================
      // PASO 2: ANÁLISIS CON IA
      // ==========================================
      if (ingredientsText.trim()) {
        console.log('\n🤖 ===== ANÁLISIS CON IA =====');
        
        try {
          let ingredientsForAI = ingredientsText;
          if (needsTranslation(ingredientsText)) {
            console.log('🌍 Traduciendo ingredientes antes del análisis de IA...');
            try {
              const translatedIngredients = await translateIngredients(ingredientsText);
              if (translatedIngredients && translatedIngredients !== ingredientsText) {
                console.log('✅ Ingredientes traducidos para IA');
                console.log('📝 Original:', ingredientsText.substring(0, 50) + '...');
                console.log('📝 Traducido:', translatedIngredients.substring(0, 50) + '...');
                ingredientsForAI = translatedIngredients;
                ingredientsText = translatedIngredients;
              } else {
                console.log('⚠️ La traducción no cambió el texto, usando original');
              }
            } catch (translationError) {
              console.error('❌ Error en traducción, usando ingredientes originales:', translationError);
            }
          }
          
          console.log('🧠 Enviando a análisis de IA...');
          const geminiAnalysis = await analyzeIngredientsWithGemini(ingredientsForAI);
          
          if (geminiAnalysis.classification !== 'unknown') {
            classification = geminiAnalysis.classification;
            confidence = geminiAnalysis.confidence;
            analysisSource = 'gemini';
            aiReasoning = geminiAnalysis.reasoning;
            confidenceExplanation = geminiAnalysis.confidenceExplanation || '';
            console.log(`✅ RESULTADO IA: ${classification.toUpperCase()} (${confidence}%)`);
          } else {
            throw new Error('IA no pudo determinar clasificación');
          }
        } catch (error) {
          console.error('❌ Error en análisis de IA:', error);
          
          // ==========================================
          // PASO 3: ANÁLISIS BÁSICO (ÚLTIMO RECURSO)
          // ==========================================
          console.log('\n🔧 Usando análisis básico como último recurso...');
          
          // Intentar traducir ingredientes para análisis básico también
          if (ingredientsText.trim() && needsTranslation(ingredientsText)) {
            try {
              console.log('🌍 Traduciendo ingredientes para análisis básico...');
              const translatedIngredients = await translateIngredients(ingredientsText);
              if (translatedIngredients && translatedIngredients !== ingredientsText) {
                console.log('✅ Ingredientes traducidos para análisis básico');
                ingredientsText = translatedIngredients;
              }
            } catch (error) {
              console.error('❌ Error al traducir ingredientes para análisis básico:', error);
            }
          }
          
          const basicAnalysis = basicIngredientAnalysis(ingredientsText);
          classification = basicAnalysis.classification;
          confidence = basicAnalysis.confidence;
          analysisSource = 'basic';
          confidenceExplanation = 'OpenFoodFacts no tiene información suficiente y el análisis de IA falló. Usando análisis básico de ingredientes conocidos.';
          console.log(`✅ RESULTADO BÁSICO: ${classification.toUpperCase()} (${confidence}%)`);
        }
      } else {
        console.log('📝 Sin ingredientes disponibles para análisis');
        classification = 'unknown';
        confidence = 0;
        analysisSource = 'basic';
        confidenceExplanation = 'No hay ingredientes disponibles para analizar y OpenFoodFacts no tiene información suficiente.';
      }
    }
    
    console.log(`\n🏁 RESULTADO FINAL: ${classification.toUpperCase()} (${confidence}% confianza) - Fuente: ${analysisSource.toUpperCase()}`);
    console.log('📝 Ingredientes finales:', ingredientsText.substring(0, 100) + '...');
    console.log('===== FIN ANÁLISIS =====\n');
    
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
      confidenceExplanation,
      scanned_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Verifica tu conexión a internet e intenta de nuevo.');
      } else if (error.message.includes('Código de barras inválido')) {
        throw error;
      } else if (error.message.includes('HTTP')) {
        throw new Error('Error del servidor. El servicio podría estar temporalmente no disponible.');
      } else {
        throw new Error(`Error al buscar el producto: ${error.message}`);
      }
    } else {
      throw new Error('Error desconocido al buscar el producto. Intenta de nuevo.');
    }
  }
}