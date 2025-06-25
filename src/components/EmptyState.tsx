import React from 'react';
import { ScanLine } from 'lucide-react';

interface EmptyStateProps {
  onStartScanning: () => void;
}

export function EmptyState({ onStartScanning }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center">
        <ScanLine className="w-12 h-12 text-green-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        ¡Comienza a escanear!
      </h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Escanea códigos de barras de productos alimenticios para verificar si son aptos para vegetarianos o veganos.
      </p>
      <button
        onClick={onStartScanning}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
      >
        Escanear Producto
      </button>
    </div>
  );
}