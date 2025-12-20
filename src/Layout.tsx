
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0a0a0a]">
      <header className="w-full max-w-7xl mb-12 text-center md:text-left flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight">
            <span className="gradient-text">PatentVision</span> AI
          </h1>
          <p className="text-gray-400 text-lg font-light">Next-generation structural analysis & 3D visualization.</p>
        </div>
        <div className="text-right hidden md:block">
           <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Engine Status</div>
           <div className="flex items-center gap-2 justify-end">
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
             <span className="text-sm font-medium text-gray-300">Gemini-3-Pro Online</span>
           </div>
        </div>
      </header>
      <main className="w-full max-w-7xl">
        {children}
      </main>
      <footer className="mt-20 py-8 text-center border-t border-white/5 w-full max-w-7xl">
        <p className="text-gray-600 text-sm">Powered by Google Cloud Vertex AI • Gemini 3 Pro • Veo 3.1</p>
      </footer>
    </div>
  );
};
