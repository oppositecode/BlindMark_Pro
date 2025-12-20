import React, { useState, useRef } from 'react';
import { Upload, ScanLine, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorker } from '../hooks/useWorker';
import { bitsToText, bitsToImageCanvas } from '../utils/helpers';
import { WatermarkType } from '../types';

const ExtractTab: React.FC = () => {
  const [extractImage, setExtractImage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [mode, setMode] = useState<WatermarkType>(WatermarkType.TEXT);
  
  const { processImage, isReady } = useWorker();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setExtractImage(URL.createObjectURL(e.target.files[0]));
      setResultText(null);
      setResultCanvas(null);
    }
  };

  const handleExtract = async () => {
    if (!extractImage || !isReady) return;
    setIsExtracting(true);
    setResultText(null);
    setResultCanvas(null);

    try {
      const img = new Image();
      img.src = extractImage;
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Updated to 64 to match EmbedTab
      const wmWidth = mode === WatermarkType.IMAGE ? 64 : 0;

      const response = await processImage({
        type: 'EXTRACT',
        imageData,
        config: { 
            strength: 0, 
            watermarkWidth: wmWidth
        }
      });

      if (response.type === 'EXTRACT_RESULT' && response.extractedBits) {
        if (mode === WatermarkType.TEXT) {
           const text = bitsToText(response.extractedBits);
           setResultText(text || "No legible text found"); 
        } else if (mode === WatermarkType.IMAGE) {
           // Updated to 64
           const canvas = bitsToImageCanvas(response.extractedBits, 64);
           setResultCanvas(canvas);
        }
      }

    } catch (e) {
      console.error(e);
      alert("Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-center transition-colors duration-300">
        <div 
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-blue-500 transition-all cursor-pointer group"
        >
          {extractImage ? (
            <img src={extractImage} alt="To Extract" className="max-h-64 mx-auto rounded shadow-lg" />
          ) : (
            <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">
               <Upload size={48} className="mb-4" />
               <p className="text-lg font-medium">Click or Drop Image Here to Extract</p>
               <p className="text-sm mt-2 opacity-70">Supports JPG, PNG, WEBP (Cropped/Rotated okay)</p>
            </div>
          )}
          <input type="file" ref={fileRef} className="hidden" onChange={handleFile} accept="image/*" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-slate-900 dark:text-white font-bold mb-4 flex items-center gap-2">
            <ScanLine size={20} className="text-blue-600 dark:text-blue-400"/> Settings
          </h3>
          
          <div className="space-y-4">
             <div>
               <label className="text-sm text-slate-500 dark:text-slate-400 mb-1 block">Expected Content Type</label>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setMode(WatermarkType.TEXT)}
                   className={`px-4 py-2 rounded border transition-colors ${mode === WatermarkType.TEXT ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                 >
                   Text
                 </button>
                 <button 
                    onClick={() => setMode(WatermarkType.IMAGE)}
                   className={`px-4 py-2 rounded border transition-colors ${mode === WatermarkType.IMAGE ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                 >
                   Image Icon
                 </button>
               </div>
             </div>
             
             <p className="text-xs text-slate-500 italic mt-4">
                Note: Soft decoding is now used, so manual strength adjustment is not needed. The algorithm automatically detects the strongest signal.
             </p>
             
             <button 
                onClick={handleExtract}
                disabled={!extractImage || isExtracting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
             >
                {isExtracting ? 'Analyzing...' : 'Extract Watermark'}
             </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[250px] transition-colors duration-300 relative overflow-hidden">
           <h3 className="text-slate-900 dark:text-white font-bold mb-4 self-start w-full border-b border-slate-200 dark:border-slate-700 pb-2">Result</h3>
           
           {resultText && (
             <div className="text-center animate-in fade-in zoom-in w-full flex flex-col items-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Decoded Text:</p>
                <div className="w-full max-h-60 overflow-y-auto bg-slate-100 dark:bg-black/30 p-4 rounded-lg border border-green-500/30 text-left">
                    <div className="text-xl font-mono text-green-600 dark:text-green-400 break-all whitespace-pre-wrap">
                        {resultText}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-500">
                    <CheckCircle size={16} /> <span className="text-sm">Extraction Successful</span>
                </div>
             </div>
           )}

           {resultCanvas && (
             <div className="text-center animate-in fade-in zoom-in w-full flex flex-col items-center">
                 <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Decoded Binary Map (64x64):</p>
                 <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg inline-flex flex-col items-center border border-slate-200 dark:border-slate-600 shadow-inner">
                    <img src={resultCanvas.toDataURL()} className="w-48 h-48 object-contain bg-black border border-slate-300 dark:border-slate-700" style={{imageRendering: 'pixelated'}} alt="Result" />
                    
                    <div className="flex gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-white border border-slate-400"></div>
                            <span>= 1 (Data)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-black border border-slate-400"></div>
                            <span>= 0 (Null)</span>
                        </div>
                    </div>
                 </div>
             </div>
           )}

           {!resultText && !resultCanvas && !isExtracting && (
             <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p>No results yet</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ExtractTab;