import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { X, CheckCircle } from 'lucide-react';

interface ProductResultModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onRemove: (productId: string) => void;
}

export function ProductResultModal({ isOpen, product, onClose, onRemove }: ProductResultModalProps) {
  if (!isOpen || !product) {
    return null;
  }

  const handleRemove = (productId: string) => {
    onRemove(productId);
    onClose(); // Cerrar el modal después de eliminar
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Solo cerrar si se hace click en el backdrop, no en el contenido del modal
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header del modal con z-index alto */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-[70]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Producto Encontrado</h2>
              <p className="text-sm text-gray-600">Resultado del análisis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-[80]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="p-6">
          <ProductCard
            product={product}
            onRemove={handleRemove}
            isLatestResult={false}
            showRemoveButton={false} // No mostrar botón de eliminar en el modal
          />
        </div>

        {/* Footer del modal con z-index alto */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl z-[70]">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
            <p className="text-sm text-gray-600">
              El producto se ha guardado en tu historial
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Continuar Escaneando
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}