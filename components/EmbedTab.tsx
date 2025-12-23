
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, RefreshCw, Zap, Image as ImageIcon, Type, Activity, ArrowRight, Fingerprint, Sliders, AlertTriangle } from 'lucide-react';
import { useWorker } from '../hooks/useWorker';
import { textToBits, imageToBits, bitsToImageCanvas } from '../utils/helpers';
import { WatermarkType } from '../types';

const CompareSlider = ({ leftImage, rightImage }: { leftImage: string, rightImage: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const onMouseDown = () => { isDragging.current = true; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
  const onTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX); };

  useEffect(() => {
    const handleGlobalUp = () => { isDragging.current = false; };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[60vh] max-h-[600px] select-none overflow-hidden rounded-lg shadow-2xl border border-slate-300 dark:border-slate-600 cursor-ew-resize group bg-black"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onClick={(e) => handleMove(e.clientX)}
    >
      {/* Right Image (Processed - Background) */}
      <img 
        src={rightImage} 
        className="absolute top-0 left-0 w-full h-full object-contain" 
        draggable={false}
        alt="Watermarked"
      />

      {/* Label Right */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded pointer-events-none">
        Watermarked
      </div>

      {/* Left Image (Original - Clipped) */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
            src={leftImage} 
            className="absolute top-0 left-0 max-w-none h-full object-contain"
            style={{ width: containerRef.current?.clientWidth }}
            draggable={false}
            alt="Original"
        />
        {/* Label Left */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded pointer-events-none">
            Original
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-transparent cursor-ew-resize flex items-center justify-center pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transform -translate-x-[2px]">
            <Sliders size={16} className="text-slate-900" />
        </div>
      </div>
    </div>
  );
};

const EmbedTab: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [wmType, setWmType] = useState<WatermarkType>(WatermarkType.TEXT);
  const [textInput, setTextInput] = useState("Copyright 2024");
  const [wmImageFile, setWmImageFile] = useState<File | null>(null);
  const [wmPreviewUrl, setWmPreviewUrl] = useState<string | null>(null);
  const [strength, setStrength] = useState(40); 

  const { processImage, isReady } = useWorker();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to generate preview of the watermark bits when image changes
  useEffect(() => {
    const generatePreview = async () => {
      if (wmType === WatermarkType.IMAGE && wmImageFile) {
        const bits = await imageToBits(wmImageFile);
        const canvas = bitsToImageCanvas(bits, 64);
        setWmPreviewUrl(canvas.toDataURL());
      } else {
        setWmPreviewUrl(null);
      }
    };
    generatePreview();
  }, [wmImageFile, wmType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceImage(URL.createObjectURL(file));
      setProcessedImage(null);
      setStatus('idle');
      setSaveError(null);
    }
  };

  const handleEmbed = async () => {
    if (!sourceImage || !isReady) return;
    setStatus('processing');
    setSaveError(null);

    try {
      let bits: number[] = [];
      let wmWidth: number | undefined = undefined;

      if (wmType === WatermarkType.TEXT) {
        bits = textToBits(textInput);
      } else if (wmType === WatermarkType.IMAGE && wmImageFile) {
        bits = await imageToBits(wmImageFile);
        wmWidth = 64; 
      } else if (wmType === WatermarkType.BINARY) {
         bits = textToBits("1010101"); 
      }

      if (bits.length === 0) {
          alert("Watermark data is empty!");
          setStatus('idle');
          return;
      }

      const img = new Image();
      img.src = sourceImage;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const response = await processImage({
        type: 'EMBED',
        imageData: imageData,
        watermarkData: bits,
        config: { 
            strength: Number(strength),
            watermarkWidth: wmWidth
        }
      });

      if (response.type === 'EMBED_RESULT' && response.imageData) {
        ctx.putImageData(response.imageData, 0, 0);
        setProcessedImage(canvas.toDataURL('image/jpeg', 1.0)); 
        setStatus('done');
      } else {
        throw new Error(response.error || "Unknown error");
      }

    } catch (err) {
      console.error(err);
      alert("Error processing image");
      setStatus('idle');
    }
  };

  const handleSaveImage = async () => {
    if (!processedImage) return;
    setSaveError(null);

    try {
      // ---------------------------------------------------------
      // 1. DESKTOP (Tauri) Saving Logic
      // ---------------------------------------------------------
      // @ts-ignore
      const tauri = typeof window !== 'undefined' ? (window.__TAURI__) : null;
      
      // If we are in Tauri environment (Global object exists)
      if (tauri) {
          try {
              // Convert Base64 -> Binary Array (needed for FS write)
              const parts = processedImage.split(',');
              const base64Data = parts[1];
              const binaryString = atob(base64Data);
              const len = binaryString.length;
              
              // Use Uint8Array for binary data (Required for correct serialization in Tauri V2)
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
              }

              // STRATEGY A: Try V2 `core.invoke` directly (Bypasses need for frontend npm packages)
              // This relies on the Rust plugin being installed in Cargo.toml and registered in lib.rs
              if (tauri.core && tauri.core.invoke) {
                  console.log("Attempting Tauri V2 Save...");
                  
                  // 1. Open Dialog 
                  // FIX: Pass options directly, do not wrap in "options" object
                  const filePath = await tauri.core.invoke('plugin:dialog|save', {
                      defaultPath: `watermarked_${Date.now()}.jpg`,
                      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg'] }]
                  });

                  if (!filePath) return; // User cancelled

                  // 2. Write File
                  // FIX: Use 'data' instead of 'contents' for the argument key
                  await tauri.core.invoke('plugin:fs|write', {
                      path: filePath,
                      data: bytes 
                  });
                  
                  alert("Image saved successfully!");
                  return;
              }

              // STRATEGY B: Try V1 style or Polyfilled (window.__TAURI__.fs)
              if (tauri.dialog && tauri.fs) {
                  const filePath = await tauri.dialog.save({
                      defaultPath: `watermarked_${Date.now()}.jpg`,
                      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg'] }]
                  });
                  if (filePath) {
                      // bytes is already Uint8Array
                      await tauri.fs.writeBinaryFile(filePath, bytes);
                      alert("Image saved successfully!");
                  }
                  return;
              }

              throw new Error("Tauri API found but invoke/fs methods missing.");

          } catch (tauriError: any) {
              console.error("Tauri save error:", tauriError);
              const msg = tauriError.message || JSON.stringify(tauriError);
              
              if (msg.includes("not allowed by ACL")) {
                  setSaveError(`Permission Denied: Missing capabilities in tauri.conf.json. Please add "capabilities": ["default"] to app.security.`);
              } else {
                  setSaveError(`Desktop Save Failed: ${msg}`);
              }
              return;
          }
      }

      // ---------------------------------------------------------
      // 2. WEB BROWSER Saving Logic (Fallback)
      // ---------------------------------------------------------
      const parts = processedImage.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Download failed", e);
      setSaveError(`Save Error: ${e.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Configuration Panel */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col gap-6 transition-colors duration-300">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="text-yellow-500 dark:text-yellow-400" /> Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2">Watermark Type</label>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                <button 
                  onClick={() => setWmType(WatermarkType.TEXT)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${wmType === WatermarkType.TEXT ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Text
                </button>
                <button 
                  onClick={() => setWmType(WatermarkType.IMAGE)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${wmType === WatermarkType.IMAGE ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Image
                </button>
              </div>
            </div>

            {wmType === WatermarkType.TEXT && (
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2">Text Content</label>
                <input 
                  type="text" 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Secret Text"
                />
              </div>
            )}

            {wmType === WatermarkType.IMAGE && (
              <div className="space-y-3">
                <label className="block text-slate-500 dark:text-slate-400 text-sm">Select Image Source</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => e.target.files && setWmImageFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-white hover:file:bg-slate-300 dark:hover:file:bg-slate-600"
                />
                
                {wmImageFile && wmPreviewUrl && (
                    <div className="bg-slate-100 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <span>Input</span>
                            <span>Extraction Fingerprint</span>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                            <div className="flex flex-col items-center gap-1 w-[40%]">
                                <img 
                                    src={URL.createObjectURL(wmImageFile)} 
                                    className="h-16 max-w-full object-contain rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                />
                                <span className="text-[10px] text-slate-500">Original</span>
                            </div>
                            
                            <ArrowRight size={16} className="text-blue-500/50" />
                            
                            <div className="flex flex-col items-center gap-1 w-[40%]">
                                <img 
                                    src={wmPreviewUrl} 
                                    className="w-16 h-16 object-contain border border-green-500/30 bg-black" 
                                    style={{imageRendering: 'pixelated'}} 
                                />
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-mono">Dithered 64x64</span>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2">
                Intensity (Robustness vs Quality): {strength}
              </label>
              <input 
                type="range" 
                min="5" 
                max="100" 
                value={strength} 
                onChange={(e) => setStrength(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors mb-3 flex items-center justify-center gap-2"
          >
            <Upload size={18} /> Select Source Image
          </button>
          
          <button 
            onClick={handleEmbed}
            disabled={!sourceImage || status === 'processing'}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
              ${!sourceImage ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50' : 
                status === 'processing' ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20'}`}
          >
            {status === 'processing' ? (
              <><RefreshCw className="animate-spin" /> Processing...</>
            ) : (
              <><Activity /> Embed Watermark</>
            )}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {processedImage && sourceImage ? <Sliders size={16}/> : null}
            {processedImage && sourceImage ? 'Comparison Preview' : 'Preview'}
          </h3>
          {processedImage && (
            <div className="flex flex-col items-end">
                <button 
                onClick={handleSaveImage}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-full flex items-center gap-2 transition-colors shadow-sm"
                >
                <Download size={14} /> Save Result
                </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 p-6 flex flex-col md:flex-row gap-4 items-center justify-center relative bg-slate-100 dark:bg-transparent bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
           {saveError && (
               <div className="absolute top-4 left-4 right-4 z-10 bg-red-100 dark:bg-red-900/90 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded-lg flex items-start gap-2 text-sm shadow-lg animate-in fade-in slide-in-from-top-2">
                   <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                   <div className="flex-1">
                       <p className="font-bold">Save Failed</p>
                       <p>{saveError}</p>
                   </div>
                   <button onClick={() => setSaveError(null)} className="opacity-70 hover:opacity-100">&times;</button>
               </div>
           )}

           {!sourceImage ? (
             <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center">
               <ImageIcon size={48} className="mb-2 opacity-50" />
               <p>No image selected</p>
             </div>
           ) : (
             <>
                {processedImage ? (
                    <div className="flex-1 w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
                        <CompareSlider leftImage={sourceImage} rightImage={processedImage} />
                    </div>
                ) : (
                    <div className="flex-1 w-full flex flex-col items-center">
                        <span className="mb-2 text-xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">Original</span>
                        <img src={sourceImage} alt="Source" className="max-h-[60vh] object-contain rounded-lg shadow-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-black" />
                    </div>
                )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default EmbedTab;
