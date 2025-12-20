import React, { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { FileText, Download, Play, AlertTriangle, FileSearch, Shield, CheckCircle, Search, XCircle } from 'lucide-react';

const PdfTab: React.FC = () => {
  const [mode, setMode] = useState<'embed' | 'extract'>('embed');

  // Embed State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [processedPdf, setProcessedPdf] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract State
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractResult, setExtractResult] = useState<{found: boolean, text?: string, metadata?: any} | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const processEmbed = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Embed visible overlay watermark (Standard Industry Practice for PDF)
      pages.forEach(page => {
        const { width, height } = page.getSize();
        page.drawText(watermarkText, {
          x: width / 2 - (watermarkText.length * 15),
          y: height / 2,
          size: 50,
          color: rgb(0.5, 0.5, 0.5),
          rotate: degrees(45),
          opacity: 0.1, // Almost invisible
        });
        
        // Also inject invisible metadata
        pdfDoc.setTitle(watermarkText);
        pdfDoc.setSubject(`Watermarked: ${watermarkText}`);
        pdfDoc.setProducer('BlindMark Pro PDF Tool');
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedPdf(URL.createObjectURL(blob));
      
    } catch (err) {
      alert("Error processing PDF");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processExtract = async () => {
      if (!extractFile) return;
      setIsExtracting(true);
      setExtractResult(null);

      try {
          const arrayBuffer = await extractFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          
          const title = pdfDoc.getTitle();
          const subject = pdfDoc.getSubject();
          const producer = pdfDoc.getProducer();

          // Logic to determine if it was watermarked by us or generally has info
          let foundText = null;
          
          if (subject && subject.startsWith('Watermarked: ')) {
              foundText = subject.replace('Watermarked: ', '');
          } else if (title) {
              foundText = title;
          }

          setExtractResult({
              found: !!foundText,
              text: foundText || undefined,
              metadata: { title, subject, producer }
          });

      } catch (err) {
          console.error(err);
          alert("Failed to parse PDF metadata");
      } finally {
          setIsExtracting(false);
      }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        {/* Mode Switcher */}
        <div className="flex justify-center">
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm inline-flex gap-1 transition-colors duration-300">
                <button 
                    onClick={() => setMode('embed')}
                    className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${mode === 'embed' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <FileText size={16} /> Embed Watermark
                </button>
                <button 
                    onClick={() => setMode('extract')}
                    className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${mode === 'extract' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <FileSearch size={16} /> Extract Watermark
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl transition-colors duration-300 animate-in fade-in slide-in-from-bottom-4">
            
            {mode === 'embed' ? (
                /* Embed View */
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                        <Shield size={32} />
                        </div>
                        <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add PDF Watermark</h2>
                        <p className="text-slate-500 dark:text-slate-400">Injects invisible metadata and visible low-opacity overlay.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-medium mb-2">Select PDF</label>
                        <input 
                            type="file" 
                            accept=".pdf"
                            onChange={(e) => {
                                if(e.target.files?.[0]) {
                                    setPdfFile(e.target.files[0]);
                                    setProcessedPdf(null);
                                }
                            }}
                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                            file:mr-4 file:py-2.5 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200
                            hover:file:bg-slate-200 dark:hover:file:bg-slate-600
                            cursor-pointer bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-medium mb-2">Watermark Text</label>
                        <input 
                            type="text" 
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
                        />
                         <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> Adds metadata tag and visual overlay.
                        </p>
                    </div>

                    <button 
                        onClick={processEmbed}
                        disabled={!pdfFile || isProcessing}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : <><Play size={18} /> Apply Watermark</>}
                    </button>

                    {processedPdf && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex justify-between items-center animate-in fade-in">
                            <span className="text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                                <CheckCircle size={18} /> Ready to download
                            </span>
                            <a 
                            href={processedPdf} 
                            download={`watermarked_${pdfFile?.name}`}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                            <Download size={18} /> Download PDF
                            </a>
                        </div>
                    )}
                </div>
            ) : (
                /* Extract View */
                 <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="p-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                        <FileSearch size={32} />
                        </div>
                        <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verify PDF Watermark</h2>
                        <p className="text-slate-500 dark:text-slate-400">Analyze PDF metadata to find hidden copyright tags.</p>
                        </div>
                    </div>

                     <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all text-center">
                        <input 
                            type="file" 
                            id="pdf-upload"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                                if(e.target.files?.[0]) {
                                    setExtractFile(e.target.files[0]);
                                    setExtractResult(null);
                                }
                            }}
                        />
                        <label htmlFor="pdf-upload" className="cursor-pointer block">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500 transition-colors">
                                <FileText size={32} />
                            </div>
                            {extractFile ? (
                                <p className="font-medium text-slate-900 dark:text-white">{extractFile.name}</p>
                            ) : (
                                <>
                                    <p className="font-medium text-slate-700 dark:text-slate-300 text-lg">Click to select PDF</p>
                                    <p className="text-slate-400 text-sm mt-1">Supports standard PDF documents</p>
                                </>
                            )}
                        </label>
                    </div>

                    <button 
                        onClick={processExtract}
                        disabled={!extractFile || isExtracting}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExtracting ? 'Analyzing Metadata...' : <><Search size={18} /> Scan PDF</>}
                    </button>

                    {extractResult && (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                            {extractResult.found ? (
                                <div className="p-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-300 mb-3">
                                        <CheckCircle size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Watermark Detected!</h3>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">Hidden metadata tag found</div>
                                    
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 inline-block min-w-[200px]">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Content</p>
                                        <p className="text-xl font-mono text-green-600 dark:text-green-400">{extractResult.text}</p>
                                    </div>

                                    {extractResult.metadata?.producer && (
                                         <div className="mt-4 text-xs text-slate-400">
                                            Producer: {extractResult.metadata.producer}
                                         </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center opacity-75">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 mb-3">
                                        <XCircle size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Watermark Found</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">This PDF does not appear to have metadata tags injected by BlindMark Pro.</p>
                                     <div className="mt-4 text-xs text-left bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                                        <p><span className="font-semibold text-slate-600 dark:text-slate-400">Title:</span> {extractResult.metadata?.title || 'N/A'}</p>
                                        <p><span className="font-semibold text-slate-600 dark:text-slate-400">Subject:</span> {extractResult.metadata?.subject || 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            )}
        </div>
    </div>
  );
};

export default PdfTab;