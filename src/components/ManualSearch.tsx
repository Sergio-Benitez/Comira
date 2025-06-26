import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface ManualSearchProps {
  onSearch: (barcode: string) => void;
  isLoading: boolean;
}

export function ManualSearch({ onSearch, isLoading }: ManualSearchProps) {
  const [barcode, setBarcode] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Función para validar código de barras
  const validateBarcode = (code: string): { isValid: boolean; error?: string } => {
    const trimmedCode = code.trim();
    
    // Verificar que no esté vacío
    if (!trimmedCode) {
      return { isValid: false, error: 'Por favor, introduce un código de barras' };
    }
    
    // Verificar longitud mínima y máxima
    if (trimmedCode.length < 8) {
      return { isValid: false, error: 'El código debe tener al menos 8 dígitos' };
    }
    
    if (trimmedCode.length > 14) {
      return { isValid: false, error: 'El código no puede tener más de 14 dígitos' };
    }
    
    // Verificar que solo contenga números
    if (!/^\d+$/.test(trimmedCode)) {
      return { isValid: false, error: 'El código solo puede contener números' };
    }
    
    // Verificar que no contenga patrones sospechosos (como URLs o texto de error)
    const suspiciousPatterns = [
      'http', 'https', 'www', '.com', '.js', 'error', 'failed', 'cannot',
      'localservice', 'webcontainer', 'TypeError', 'navigate'
    ];
    
    const lowerCode = trimmedCode.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (lowerCode.includes(pattern)) {
        return { isValid: false, error: 'Formato de código inválido. Introduce solo números.' };
      }
    }
    
    return { isValid: true };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcode(value);
    
    // Limpiar error cuando el usuario empiece a escribir
    if (inputError) {
      setInputError(null);
    }
    
    // Filtrar caracteres no numéricos en tiempo real (excepto espacios para permitir pegado)
    const numericValue = value.replace(/[^\d\s]/g, '');
    if (numericValue !== value) {
      setBarcode(numericValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateBarcode(barcode);
    
    if (!validation.isValid) {
      setInputError(validation.error || 'Código inválido');
      return;
    }
    
    // Limpiar espacios y enviar
    const cleanBarcode = barcode.trim().replace(/\s/g, '');
    setInputError(null);
    onSearch(cleanBarcode);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Prevenir el comportamiento por defecto
    e.preventDefault();
    
    // Obtener el contenido del portapapeles
    const pastedText = e.clipboardData.getData('text');
    
    // Limpiar el contenido pegado (solo números)
    const cleanValue = pastedText.replace(/[^\d]/g, '');
    
    // Actualizar el estado
    setBarcode(cleanValue);
    
    // Limpiar error si había uno
    if (inputError) {
      setInputError(null);
    }
    
    // Validar inmediatamente después del pegado
    const validation = validateBarcode(cleanValue);
    if (!validation.isValid) {
      setInputError(validation.error || 'Código inválido');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={barcode}
          onChange={handleInputChange}
          onPaste={handlePaste}
          placeholder="Introduce el código de barras (solo números)"
          className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 transition-colors ${
            inputError 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-green-500'
          }`}
          disabled={isLoading}
          maxLength={14}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <button
          type="submit"
          disabled={!barcode.trim() || isLoading || !!inputError}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Mostrar error de validación */}
      {inputError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{inputError}</p>
        </div>
      )}
      
      {/* Ayuda para el usuario */}
      <div className="mt-2 text-xs text-gray-500">
        <p>Ejemplos: 5449000131805, 8410076472106</p>
        <p>Los códigos de barras suelen tener entre 8 y 14 dígitos</p>
      </div>
    </form>
  );
}