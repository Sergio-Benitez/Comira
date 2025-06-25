import React from 'react';
import { Product } from '../types';
import { Leaf, Heart, AlertTriangle, Clock, Package, X, Brain, Database, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onRemove?: (productId: string) => void;
}

export function ProductCard({ product, onRemove }: ProductCardProps) {
  const getClassificationColor = (classification: string, analysisSource?: string) => {
    // Si es análisis de IA (Gemini), usar colores azules
    if (analysisSource === 'gemini') {
      switch (classification) {
        case 'vegan':
        case 'vegetarian':
          return 'bg-blue-50 border-blue-200 text-blue-800';
        case 'omnivore':
          return 'bg-blue-50 border-blue-200 text-blue-800';
        default:
          return 'bg-blue-50 border-blue-200 text-blue-800';
      }
    }
    
    // Para base de datos y análisis básico, usar verde para vegano y vegetariano
    switch (classification) {
      case 'vegan':
      case 'vegetarian':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'omnivore':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'vegan':
        return <Leaf className="w-4 h-4" />;
      case 'vegetarian':
        return <Heart className="w-4 h-4" />;
      case 'omnivore':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getClassificationText = (classification: string) => {
    switch (classification) {
      case 'vegan':
        return 'Vegano y Vegetariano';
      case 'vegetarian':
        return 'Vegetariano';
      case 'omnivore':
        return 'Contiene productos animales';
      default:
        return 'No determinado';
    }
  };

  const getAnalysisSourceIcon = (source?: string) => {
    switch (source) {
      case 'gemini':
        return <Brain className="w-3 h-3" />;
      case 'openfoodfacts':
        return <Database className="w-3 h-3" />;
      case 'basic':
        return <Zap className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getAnalysisSourceText = (source?: string) => {
    switch (source) {
      case 'gemini':
        return 'Análisis IA';
      case 'openfoodfacts':
        return 'Base de datos';
      case 'basic':
        return 'Análisis básico';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {product.image_front_url && (
          <img
            src={product.image_front_url}
            alt={product.product_name}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
              {product.product_name}
            </h3>
            {onRemove && (
              <button
                onClick={() => onRemove(product.id)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {product.brands && (
            <p className="text-gray-600 text-sm mb-2">{product.brands}</p>
          )}
          
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3 ${getClassificationColor(product.classification, product.analysisSource)}`}>
            {getClassificationIcon(product.classification)}
            {getClassificationText(product.classification)}
            <span className="text-xs opacity-75">
              ({product.confidence}% confianza)
            </span>
          </div>

          {/* Mostrar fuente del análisis */}
          {product.analysisSource && (
            <div className="flex items-center gap-1 mb-2">
              {getAnalysisSourceIcon(product.analysisSource)}
              <span className="text-xs text-gray-500">
                {getAnalysisSourceText(product.analysisSource)}
              </span>
            </div>
          )}

          {/* Mostrar razonamiento de IA si está disponible */}
          {product.aiReasoning && product.analysisSource === 'gemini' && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <h4 className="text-xs font-medium text-blue-700 mb-1">Análisis IA:</h4>
              <p className="text-xs text-blue-600">
                {product.aiReasoning}
              </p>
            </div>
          )}
          
          {product.ingredients_text && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Ingredientes:</h4>
              <p className="text-xs text-gray-600 line-clamp-2">
                {product.ingredients_text}
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(product.scanned_at)}
            </span>
            <span>Código: {product.code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}