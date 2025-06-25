import React from 'react';
import { Leaf } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FoodScan</h1>
            <p className="text-sm text-gray-600">Verificador Vegano y Vegetariano</p>
          </div>
        </div>
      </div>
    </header>
  );
}