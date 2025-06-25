export interface Product {
  id: string;
  code: string;
  product_name: string;
  brands: string;
  categories: string;
  ingredients_text: string;
  allergens: string;
  nutrition_grades: string;
  image_url: string;
  image_front_url: string;
  vegetarian?: boolean;
  vegan?: boolean;
  classification: 'vegan' | 'vegetarian' | 'omnivore' | 'unknown';
  confidence: number;
  analysisSource?: 'openfoodfacts' | 'gemini' | 'basic';
  aiReasoning?: string;
  scanned_at: string;
}

export interface ScannerState {
  isScanning: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

export interface OpenFoodFactsResponse {
  status: number;
  product?: {
    _id: string;
    code: string;
    product_name: string;
    brands: string;
    categories: string;
    ingredients_text_es?: string;
    ingredients_text?: string;
    allergens: string;
    nutrition_grades: string;
    image_url: string;
    image_front_url: string;
    vegetarian?: string;
    vegan?: string;
    ingredients_analysis?: {
      'en:vegetarian'?: string[];
      'en:vegan'?: string[];
      'en:non-vegetarian'?: string[];
      'en:non-vegan'?: string[];
    };
  };
}