import React, { useState } from 'react';
import { Product } from '../types';
import { Leaf, Heart, AlertTriangle, Clock, Package, X, Brain, Database, Zap, ChevronDown, ChevronUp, ZoomIn, HelpCircle, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onRemove?: (productId: string) => void;
  isLatestResult?: boolean;
  showRemoveButton?: boolean;
}

export function ProductCard({ product, onRemove, isLatestResult = false, showRemoveButton = true }: ProductCardProps) {
  const [showFullIngredients, setShowFullIngredients] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showConfidenceExplanation, setShowConfidenceExplanation] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'vegan':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'vegetarian':
        return 'bg-blue-50 border-blue-200 text-blue-800';
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
      case 'openfoodfacts':
        return <Database className="w-3 h-3" />;
      case 'gemini':
        return <Brain className="w-3 h-3" />;
      case 'basic':
        return <Zap className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getAnalysisSourceText = (source?: string) => {
    switch (source) {
      case 'openfoodfacts':
        return 'Base de datos OpenFoodFacts';
      case 'gemini':
        return 'Análisis con Inteligencia Artificial';
      case 'basic':
        return 'Análisis básico de ingredientes';
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

  const truncateIngredients = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };

  const handleToggleConfidenceExplanation = () => {
    if (!showConfidenceExplanation && showAIAnalysis) {
      setShowAIAnalysis(false);
    }
    setShowConfidenceExplanation(!showConfidenceExplanation);
  };

  const handleToggleAIAnalysis = () => {
    if (!showAIAnalysis && showConfidenceExplanation) {
      setShowConfidenceExplanation(false);
    }
    setShowAIAnalysis(!showAIAnalysis);
  };

  return (
    <>
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow ${
        isLatestResult ? 'ring-2 ring-green-500 ring-opacity-50' : ''
      }`}>
        {isLatestResult && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-medium text-green-800">Resultado de la búsqueda</span>
            </div>
          </div>
        )}
        
        {/* Layout: imagen a la izquierda, contenido a la derecha */}
        <div className="flex gap-3 sm:gap-4">
          {/* Imagen del producto */}
          {product.image_front_url && (
            <div className="relative flex-shrink-0">
              <img
                src={product.image_front_url}
                alt={product.product_name}
                className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowImageModal(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                onClick={() => setShowImageModal(true)}
                className="absolute top-1 right-1 p-0.5 sm:p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors z-10"
              >
                <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
          
          {/* Contenido principal - ocupa el resto del espacio */}
          <div className="flex-1 min-w-0">
            {/* Header con título y botón eliminar */}
            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg leading-tight">
                  {product.product_name}
                </h3>
                {product.brands && (
                  <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">{product.brands}</p>
                )}
              </div>
              {onRemove && showRemoveButton && (
                <button
                  onClick={() => onRemove(product.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 z-10"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
            
            {/* Clasificación y confianza - STACK EN MÓVIL */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-2 sm:mb-3">
              <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getClassificationColor(product.classification)}`}>
                {getClassificationIcon(product.classification)}
                <span>{getClassificationText(product.classification)}</span>
              </div>
              
              <button
                onClick={handleToggleConfidenceExplanation}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all z-10 ${
                  product.confidence < 100 && product.confidenceExplanation 
                    ? 'cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700' 
                    : 'cursor-default text-gray-500'
                }`}
                disabled={!(product.confidence < 100 && product.confidenceExplanation)}
              >
                {product.confidence}% confianza
                {(product.confidence < 100 && product.confidenceExplanation) && (
                  <HelpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                )}
              </button>
            </div>

            {/* Fuente del análisis (no IA) */}
            {product.analysisSource && product.analysisSource !== 'gemini' && (
              <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                {getAnalysisSourceIcon(product.analysisSource)}
                <span className="text-xs text-gray-500">
                  {getAnalysisSourceText(product.analysisSource)}
                </span>
              </div>
            )}
            
            {/* Botón especial para IA */}
            {product.analysisSource === 'gemini' && product.aiReasoning && (
              <div className="mb-2 sm:mb-3">
                <button
                  onClick={handleToggleAIAnalysis}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-xs sm:text-sm w-full z-10"
                >
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-blue-700 font-medium">
                    Resultado decidido por IA
                  </span>
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* EXPLICACIONES DESPLEGABLES - OCUPAN TODO EL ANCHO */}
        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          {/* Explicación de confianza */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showConfidenceExplanation ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            {product.confidenceExplanation && (
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="text-xs sm:text-sm font-medium text-yellow-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  ¿Por qué no es 100% confianza?
                </h4>
                <p className="text-xs sm:text-sm text-yellow-600 leading-relaxed">
                  {product.confidenceExplanation}
                </p>
              </div>
            )}
          </div>

          {/* Análisis de IA */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showAIAnalysis ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            {product.aiReasoning && product.analysisSource === 'gemini' && (
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-xs sm:text-sm font-medium text-blue-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                  Análisis de Inteligencia Artificial:
                </h4>
                <p className="text-xs sm:text-sm text-blue-600 leading-relaxed">
                  {product.aiReasoning}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN DE INGREDIENTES - OCUPA TODO EL ANCHO */}
        {product.ingredients_text && (
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700">Ingredientes:</h4>
              {product.ingredients_text.length > 120 && (
                <button
                  onClick={() => setShowFullIngredients(!showFullIngredients)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors z-10 flex-shrink-0"
                >
                  {showFullIngredients ? (
                    <>
                      <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Mostrar menos</span>
                      <span className="sm:hidden">Menos</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Ver lista completa</span>
                      <span className="sm:hidden">Ver más</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Contenedor de ingredientes - ALTURA MÍNIMA PARA EVITAR CORTES */}
            <div className={`text-xs sm:text-sm text-gray-600 leading-relaxed transition-all duration-300 ${
              showFullIngredients ? 'max-h-none' : 'max-h-20 sm:max-h-16 overflow-hidden'
            }`}>
              <p className="break-words">
                {showFullIngredients ? product.ingredients_text : truncateIngredients(product.ingredients_text)}
              </p>
            </div>
          </div>
        )}

        {/* INFORMACIÓN DE FECHA Y CÓDIGO - AL FINAL */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {formatDate(product.scanned_at)}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            Código: {product.code}
          </span>
        </div>
      </div>

      {/* Modal de imagen ampliada */}
      {showImageModal && product.image_front_url && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-[110]"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={product.image_front_url}
              alt={product.product_name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}