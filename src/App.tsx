import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ProductCard } from './components/ProductCard';
import { ManualSearch } from './components/ManualSearch';
import { EmptyState } from './components/EmptyState';
import { ProductResultModal } from './components/ProductResultModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchProductByBarcode } from './services/foodService';
import { Product } from './types';
import { Camera, Search, History, AlertCircle, Loader2, X, Brain } from 'lucide-react';

function App() {
  const [products, setProducts] = useLocalStorage<Product[]>('scanned-products', []);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Buscando producto...');

  const handleScanSuccess = useCallback(async (barcode: string) => {
    setIsScanning(false);
    setIsLoading(true);
    setError(null);
    setLastScannedProduct(null);
    setShowProductModal(false);
    setLoadingMessage('Buscando producto en OpenFoodFacts...');

    try {
      console.log('Buscando producto con código:', barcode);
      
      // Actualizar mensaje si toma tiempo
      const loadingTimer = setTimeout(() => {
        setLoadingMessage('Analizando ingredientes con IA...');
      }, 3000);
      
      const product = await fetchProductByBarcode(barcode);
      
      clearTimeout(loadingTimer);
      
      if (product) {
        console.log('Producto encontrado:', product);
        setLastScannedProduct(product);
        setProducts(prev => {
          const filtered = prev.filter(p => p.code !== product.code);
          return [product, ...filtered].slice(0, 50); // Keep last 50 products
        });
        
        // Mostrar el modal con el resultado
        setShowProductModal(true);
      } else {
        setError('Producto no encontrado en la base de datos de OpenFoodFacts');
      }
    } catch (err) {
      console.error('Error al buscar producto:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al buscar el producto');
    } finally {
      setIsLoading(false);
      setLoadingMessage('Buscando producto...');
    }
  }, [setProducts]);

  const handleRemoveProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    // Si el producto eliminado es el último escaneado, limpiarlo
    if (lastScannedProduct && lastScannedProduct.id === productId) {
      setLastScannedProduct(null);
    }
  }, [setProducts, lastScannedProduct]);

  const handleCloseProductModal = () => {
    setShowProductModal(false);
  };

  const clearError = () => setError(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'scanner'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            Escanear
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Historial ({products.length})
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl p-8 text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              {loadingMessage.includes('IA') && <Brain className="w-6 h-6 text-blue-500" />}
            </div>
            <p className="text-gray-600">{loadingMessage}</p>
            {loadingMessage.includes('IA') && (
              <p className="text-sm text-blue-600 mt-2">
                Analizando ingredientes con inteligencia artificial...
              </p>
            )}
          </div>
        )}

        {/* Scanner Tab */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Buscar Producto
              </h2>
              
              <div className="space-y-4">
                <button
                  onClick={() => setIsScanning(true)}
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-4 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <Camera className="w-5 h-5" />
                  Escanear con Cámara
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">o</span>
                  </div>
                </div>
                
                <ManualSearch onSearch={handleScanSuccess} isLoading={isLoading} />
              </div>

              {/* AI Analysis Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Análisis con IA</h3>
                </div>
                <p className="text-sm text-blue-700">
                  Utilizamos inteligencia artificial para analizar los ingredientes cuando la información 
                  no está disponible en la base de datos, proporcionando análisis más precisos.
                </p>
              </div>
            </div>

            {/* Empty state solo si no hay productos y no hay resultado reciente */}
            {products.length === 0 && !isLoading && !lastScannedProduct && (
              <EmptyState onStartScanning={() => setIsScanning(true)} />
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {products.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Productos Escaneados
                  </h2>
                  <button
                    onClick={() => {
                      setProducts([]);
                      setLastScannedProduct(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Limpiar historial
                  </button>
                </div>
                
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onRemove={handleRemoveProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay productos escaneados
                </h3>
                <p className="text-gray-600 mb-6">
                  Los productos que escanees aparecerán aquí
                </p>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Escanear Primer Producto
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Scanner Modal */}
      <BarcodeScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onClose={() => setIsScanning(false)}
      />

      {/* Product Result Modal */}
      <ProductResultModal
        isOpen={showProductModal}
        product={lastScannedProduct}
        onClose={handleCloseProductModal}
        onRemove={handleRemoveProduct}
      />
    </div>
  );
}

export default App;