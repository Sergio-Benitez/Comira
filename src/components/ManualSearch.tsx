import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface ManualSearchProps {
  onSearch: (barcode: string) => void;
  isLoading: boolean;
}

export function ManualSearch({ onSearch, isLoading }: ManualSearchProps) {
  const [barcode, setBarcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onSearch(barcode.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Introduce el código de barras manualmente"
          className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!barcode.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}