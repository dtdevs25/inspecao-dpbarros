import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool, X, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
}

export function SignaturePad({ label, onSignatureChange, initialSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // To handle orientation
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Set canvas background and initial image when modal opens
  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set canvas to parent size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (initialSignature) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw image scaled down if needed, but centered
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          };
          img.src = initialSignature;
        }
      }
    }
  }, [isModalOpen, initialSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
    setIsModalOpen(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setHasSignature(false);
      onSignatureChange(null);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700">{label}</label>
        {hasSignature && !isModalOpen && (
          <button
            type="button"
            onClick={() => { setHasSignature(false); onSignatureChange(null); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <Eraser className="w-3 h-3" />
            Remover
          </button>
        )}
      </div>
      
      {!isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-green-50 hover:border-[#27AE60] transition-colors cursor-pointer relative overflow-hidden"
        >
          {hasSignature && initialSignature ? (
             <img src={initialSignature} alt="Signature" className="w-full max-h-32 object-contain bg-white" />
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-gray-400">
              <PenTool className="w-8 h-8 mb-2" />
              <span className="text-sm font-bold">Clique aqui para assinar</span>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8">
          {/* Portrait Warning Overlay for Mobile */}
          {isPortrait && window.innerWidth < 768 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white p-6 text-center">
              <RotateCcw className="w-16 h-16 animate-bounce text-[#27AE60] mb-4" />
              <h2 className="text-2xl font-black mb-2">Vire o Celular</h2>
              <p className="text-gray-300">Por favor, vire o seu aparelho na horizontal para ter mais espaço para assinar.</p>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="mt-8 px-6 py-2 border border-white rounded-full font-bold"
              >
                Cancelar
              </button>
            </div>
          )}
          
          <div className="bg-white w-full h-full max-w-5xl max-h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
            <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-800">{label}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-sm"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 bg-gray-50 p-4 sm:p-8 relative">
              <div className="w-full h-full border-2 border-gray-300 rounded-xl bg-white shadow-inner relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                />
              </div>
            </div>
            
            <div className="bg-gray-100 p-4 border-t border-gray-200 flex items-center justify-between shrink-0">
              <button type="button" onClick={clearSignature} className="px-6 py-3 text-red-500 font-bold flex items-center gap-2 hover:bg-red-50 rounded-xl transition-colors">
                <Eraser className="w-5 h-5" /> Limpar
              </button>
              <button type="button" onClick={saveSignature} className="px-8 py-3 bg-[#27AE60] text-white font-bold rounded-xl shadow-lg hover:bg-[#219150] transition-colors">
                Salvar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
