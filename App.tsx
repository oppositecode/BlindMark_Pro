import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, FileText, Menu, X, Fingerprint, Sun, Moon } from 'lucide-react';
import EmbedTab from './components/EmbedTab';
import ExtractTab from './components/ExtractTab';
import PdfTab from './components/PdfTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'embed' | 'extract' | 'pdf'>('embed');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check system preference on mount if needed, or default to dark
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
       // setIsDark(false); // Optional: respect system preference. For now defaulting to dark as per original design
    }
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all w-full md:w-auto font-medium ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col font-sans selection:bg-blue-500/30 transition-colors duration-300">
        
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl tracking-tight">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Fingerprint size={24} className="text-white" />
              </div>
              BlindMark <span className="text-blue-600 dark:text-blue-500">Pro</span>
            </div>

            <div className="hidden md:flex gap-2 items-center">
              <NavItem id="embed" icon={Layers} label="Embed Watermark" />
              <NavItem id="extract" icon={ShieldCheck} label="Extract & Verify" />
              <NavItem id="pdf" icon={FileText} label="PDF Tools" />
              
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>
              
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <div className="flex items-center gap-4 md:hidden">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                className="text-slate-500 dark:text-slate-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xl">
              <NavItem id="embed" icon={Layers} label="Embed" />
              <NavItem id="extract" icon={ShieldCheck} label="Extract" />
              <NavItem id="pdf" icon={FileText} label="PDF" />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'embed' && <EmbedTab />}
            {activeTab === 'extract' && <ExtractTab />}
            {activeTab === 'pdf' && <PdfTab />}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-500 dark:text-slate-600 text-sm transition-colors duration-300">
          <p>&copy; {new Date().getFullYear()} BlindMark Pro. DCT Blind Watermarking Technology.</p>
          <p className="mt-1">Robust against Cropping, Rotation (partial), Noise & Compression.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;