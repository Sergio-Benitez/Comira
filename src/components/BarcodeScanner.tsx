import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onClose: () => void;
  isActive: boolean;
}

export function BarcodeScanner({ onScanSuccess, onClose, isActive }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const initScanner = async () => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            aspectRatio: 2.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            rememberLastUsedCamera: true,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            console.log('Código escaneado:', decodedText);
            onScanSuccess(decodedText);
            scanner.clear();
          },
          (error) => {
            // Solo mostrar errores relevantes, no los de escaneo continuo
            if (!error.includes('NotFoundException') && !error.includes('No MultiFormat Readers')) {
              console.log('Error de escaneo:', error);
            }
          }
        );

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize scanner:', error);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [isActive, onScanSuccess]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-6">
          <Camera className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Escanear Código de Barras
          </h2>
          <p className="text-gray-600 text-sm">
            Apunta la cámara hacia el código de barras del producto. 
            Mantén el código centrado y bien iluminado.
          </p>
        </div>
        
        <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
        
        {!isInitialized && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Iniciando cámara...</p>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Tip: Asegúrate de que el código de barras esté bien enfocado y sin reflejos
          </p>
        </div>
      </div>
    </div>
  );
}