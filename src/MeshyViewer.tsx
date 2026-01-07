
import React, { useState, useRef, useEffect } from 'react';
import type { LegalAnalysis } from '../types';

interface MeshyViewerProps {
  modelUrl: string;
  legalData: LegalAnalysis | null;
}

export const MeshyViewer: React.FC<MeshyViewerProps> = ({ modelUrl, legalData }) => {
  const [showRisk, setShowRisk] = useState(false);
  const viewerRef = useRef<HTMLElement>(null);
  
  // Google Model Viewer Theme
  // We use a dark theme background similar to the Editor
  const BG_COLOR = "#202124"; 

  useEffect(() => {
     // Optional: interact with the model viewer API if needed
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const viewer = viewerRef.current as any;
     if(viewer && showRisk) {
         // If we had specific material names, we could tint them here.
         // For now, we rely on the UI overlay as generic GLB parts vary.
     }
  }, [showRisk, modelUrl]);

  return (
    <div className="w-full h-full min-h-[500px] relative group overflow-hidden" style={{ backgroundColor: BG_COLOR }}>
      
      {/* Google Model Viewer Component */}
      {/* @ts-expect-error - Custom Element */}
      <model-viewer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={viewerRef as any}
        src={modelUrl}
        alt="Generated 3D Patent Model"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        exposure="0.8"
        auto-rotate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ width: '100%', height: '100%', '--progress-bar-color': '#60a5fa' } as any}
      >
          {/* Custom Loading Slot */}
          <div slot="poster" className="flex items-center justify-center w-full h-full text-white">
             Loading 3D Model...
          </div>
      {/* @ts-ignore */}
      </model-viewer>

      {/* Editor-like UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
             <div className="bg-[#303134] px-3 py-1.5 rounded-md border border-white/10 shadow-lg flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">G</div>
                <span className="text-xs font-medium text-gray-200">Model Viewer</span>
             </div>
          </div>
          
          {legalData && (
             <button
                onClick={() => setShowRisk(!showRisk)}
                className={`pointer-events-auto px-4 py-1.5 rounded-md text-xs font-medium transition-all shadow-lg border ${
                  showRisk 
                  ? 'bg-red-500/10 border-red-500 text-red-400' 
                  : 'bg-[#303134] border-white/10 text-gray-300 hover:bg-[#3c4043]'
                }`}
             >
                {showRisk ? '● Patent Risk Overlay' : '○ Risk Analysis'}
             </button>
          )}
      </div>

      {/* Risk Analysis Detail Panel */}
      {showRisk && legalData && (
        <div className="absolute top-16 right-4 w-72 bg-[#303134]/95 backdrop-blur border border-white/10 shadow-2xl rounded-lg overflow-hidden animate-in fade-in slide-in-from-right-4 z-10">
           <div className="bg-red-900/20 px-4 py-3 border-b border-red-500/20 flex justify-between items-center">
              <h4 className="text-xs font-bold text-red-200 uppercase tracking-wider">Infringement Risk</h4>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
           </div>
           <div className="p-4 max-h-[300px] overflow-y-auto">
              <div className="mb-4">
                 <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Protected Geometry (High Risk)</p>
                 <ul className="space-y-2">
                   {legalData.protectedParts.map((part, i) => (
                     <li key={i} className="text-xs text-white flex items-start gap-2">
                       <span className="text-red-400 mt-0.5">⚠</span>
                       {part}
                     </li>
                   ))}
                 </ul>
              </div>
              <div className="pt-3 border-t border-white/5">
                 <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Unprotected (Safe)</p>
                 <ul className="space-y-1">
                   {legalData.unprotectedParts.map((part, i) => (
                     <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-green-500/50">✓</span>
                        {part}
                     </li>
                   ))}
                 </ul>
              </div>
           </div>
        </div>
      )}

      {/* Footer Controls Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#303134]/80 backdrop-blur px-4 py-2 rounded-full border border-white/5 shadow-lg pointer-events-none">
         <p className="text-[10px] text-gray-400 flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-white rounded-full"></span> Rotate</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-white rounded-full"></span> Zoom</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-white rounded-full"></span> Pan</span>
         </p>
      </div>

    </div>
  );
};
