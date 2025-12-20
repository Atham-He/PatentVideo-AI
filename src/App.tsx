
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './Layout';
import { analyzePatent, generateStructuralVideo, identifyPatentFigures, performLegalAnalysis } from './services/geminiService';
import { generateMeshyModel } from './services/meshyService';
import { MeshyViewer } from './MeshyViewer';
import type { AppState } from '../types';

// Mocking PDF.js globally as it is loaded in index.html
declare const pdfjsLib: any;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    file: null,
    pdfImages: [],
    figureIndices: [],
    analysis: null,
    legalAnalysis: null,
    videoUrl: null,
    isAnalyzing: false,
    isLegalAnalyzing: false,
    isVideoGenerating: false,
    error: null,
    isVeoKeySelected: false,
    meshyApiKey: process.env.MESHY_API_KEY || 'msy_nOLxD8n4qCBD57UD2rblZLxYxHIIyqIshEK8',
    isMeshyGenerating: false,
    meshyModelUrl: null
  });

  const checkKeyStatus = useCallback(async () => {
    if ((window as any).aistudio?.hasSelectedApiKey) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setState(prev => ({ ...prev, isVeoKeySelected: hasKey }));
      return hasKey;
    }
    return false;
  }, []);

  useEffect(() => {
    checkKeyStatus();
  }, [checkKeyStatus]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setState(prev => ({ ...prev, isVeoKeySelected: true, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "API Key selection is not supported in this environment." }));
    }
  };

  const handleError = (err: any, context: string) => {
    console.error(`Error during ${context}:`, err);
    let errStr = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
    
    if (errStr.toLowerCase().includes("not found") || errStr.toLowerCase().includes("requested entity")) {
      setState(prev => ({ 
        ...prev, 
        error: "API credentials error. Please re-select a valid API key.", 
        isVeoKeySelected: false,
        isAnalyzing: false,
        isLegalAnalyzing: false, 
        isVideoGenerating: false, 
        isMeshyGenerating: false
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        error: `${context} failed: ${errStr.substring(0, 100)}`, 
        isAnalyzing: false,
        isLegalAnalyzing: false, 
        isVideoGenerating: false, 
        isMeshyGenerating: false
      }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setState(prev => ({ ...prev, error: "Please upload a valid PDF file." }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      file, 
      isAnalyzing: true, 
      isLegalAnalyzing: true, 
      error: null, 
      pdfImages: [], 
      figureIndices: [],
      analysis: null, 
      legalAnalysis: null,
      videoUrl: null, 
      meshyModelUrl: null 
    }));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: string[] = [];
      
      // Increased to 15 to capture all potential figure pages
      const pagesToProcess = Math.min(pdf.numPages, 15);
      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      // 1. Identify Figures (Fast)
      identifyPatentFigures(images)
        .then(indices => {
          setState(prev => ({ ...prev, figureIndices: indices }));
        })
        .catch(err => console.error("Figure ID failed", err));

      // 2. Main Analysis (Structure)
      analyzePatent(images)
        .then(analysis => {
          setState(prev => ({ ...prev, pdfImages: images, analysis, isAnalyzing: false }));
        })
        .catch(err => handleError(err, "Main Analysis"));

      // 3. Parallel Legal Analysis (Protection/Plagiarism)
      performLegalAnalysis(images)
        .then(legalAnalysis => {
          setState(prev => ({ ...prev, legalAnalysis, isLegalAnalyzing: false }));
        })
        .catch(err => {
          console.error("Legal Analysis failed", err);
          setState(prev => ({ ...prev, isLegalAnalyzing: false }));
        });

    } catch (err) {
      handleError(err, "File Processing");
    }
  };

  const handleGenerateVideo = async () => {
    if (!state.analysis) return;
    if (!state.isVeoKeySelected) await handleSelectKey();

    setState(prev => ({ ...prev, isVideoGenerating: true, error: null }));
    try {
      const videoUrl = await generateStructuralVideo(state.analysis.visualPrompt);
      setState(prev => ({ ...prev, videoUrl, isVideoGenerating: false }));
    } catch (err: any) {
      handleError(err, "Video generation");
    }
  };

  const handleGenerateMeshy = async (imageUrl: string) => {
    if (!state.meshyApiKey) {
      setState(prev => ({ ...prev, error: "Please enter your Meshy.ai API Key first." }));
      return;
    }
    setState(prev => ({ ...prev, isMeshyGenerating: true, error: null, meshyModelUrl: null }));
    
    try {
      const modelUrl = await generateMeshyModel(state.meshyApiKey, imageUrl);
      setState(prev => ({ ...prev, meshyModelUrl: modelUrl, isMeshyGenerating: false }));
    } catch (err) {
      handleError(err, "Meshy 3D Generation");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-16">
        
        {/* HERO UPLOAD */}
        <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-700">
          <div className="glass-panel rounded-3xl p-10 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-blue-600/20 transition-colors duration-700"></div>

             <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Upload Patent Specification</h2>
                  <button 
                    onClick={handleSelectKey}
                    className={`text-xs px-4 py-1.5 rounded-full font-medium transition-all ${state.isVeoKeySelected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}
                  >
                    {state.isVeoKeySelected ? "● Veo API Key Active" : "○ Set Veo API Key"}
                  </button>
                </div>
                
                <div className="border-2 border-dashed border-gray-700/50 hover:border-blue-500/50 rounded-2xl p-12 transition-all bg-black/20 hover:bg-black/40 relative cursor-pointer group/drop flex flex-col items-center justify-center gap-6">
                  <input type="file" accept="application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center group-hover/drop:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-gray-400 group-hover/drop:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-gray-200">{state.file ? state.file.name : "Drop PDF Document Here"}</p>
                    <p className="text-sm text-gray-500">Accepts USPTO & PCT standard formats</p>
                  </div>
                  <div className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors shadow-lg z-10 pointer-events-none group-hover/drop:scale-105 transform duration-200">
                    {state.file ? "Replace PDF File" : "Select PDF File"}
                  </div>
                </div>

                {state.isAnalyzing && (
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-between text-xs font-mono text-blue-400">
                      <span className="animate-pulse">ANALYZING GEOMETRY...</span>
                      <span>GEMINI-3-PRO</span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 animate-progress w-full"></div>
                    </div>
                  </div>
                )}
                
                {state.isLegalAnalyzing && !state.isAnalyzing && (
                   <div className="mt-2 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                     <span className="text-xs font-mono text-yellow-500">Processing Parallel Legal Analysis...</span>
                   </div>
                )}

                {/* EXTRACTED FIGURES - Filtered by AI */}
                {state.pdfImages.length > 0 && !state.isAnalyzing && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Extracted Figures (Select to Generate 3D)</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                      {state.pdfImages.map((img, idx) => {
                        // Only show if it is identified as a figure, or if analysis failed show all
                        if (state.figureIndices.length > 0 && !state.figureIndices.includes(idx)) return null;
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleGenerateMeshy(img)}
                            className="snap-start shrink-0 relative group/img cursor-pointer transition-transform hover:scale-105"
                          >
                             <img src={img} alt={`Fig ${idx + 1}`} className="h-32 rounded-lg border border-white/10 bg-white" />
                             <div className="absolute inset-0 bg-blue-600/50 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white uppercase bg-black/50 px-2 py-1 rounded">Make 3D</span>
                             </div>
                             <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 rounded text-[8px] font-mono text-white">Page {idx+1}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        {state.meshyApiKey ? (
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-500/30 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-xs text-green-400 font-mono">Meshy API Key Active</span>
                           </div>
                        ) : null}
                    </div>
                  </div>
                )}
                
                {state.error && <div className="mt-4 p-3 bg-red-900/20 text-red-300 text-xs rounded border border-red-500/20">{state.error}</div>}
             </div>
          </div>
        </div>

        {/* ANALYSIS GRID */}
        {state.analysis && (
          <div className="w-full animate-in slide-in-from-bottom-12 duration-1000">
             
             <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-4">
                  <span>US PATENT {state.analysis.patentNumber}</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-4xl mx-auto">{state.analysis.title}</h2>
                <p className="text-gray-400">Invented by <span className="text-gray-300">{state.analysis.inventors.join(', ')}</span></p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* CORE INNOVATION */}
                <div className="lg:col-span-6 space-y-8">
                   <div className="glass-panel rounded-3xl p-8 border-l-4 border-l-blue-500 shadow-xl bg-gradient-to-br from-white/5 to-transparent h-full flex flex-col">
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Primary Technical Innovation</h3>
                      <p className="text-xl font-medium text-white leading-relaxed mb-8">{state.analysis.coreInnovation}</p>
                      
                      {/* LEGAL RISK BOX */}
                      {state.legalAnalysis ? (
                        <div className="mt-auto pt-6 border-t border-white/10">
                          <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                             Legal Protection Analysis
                          </h3>
                          <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 space-y-3">
                             <div>
                               <span className="text-[10px] text-red-300 font-bold uppercase">Protected Parts (No Copying)</span>
                               <p className="text-xs text-red-200 mt-1">{state.legalAnalysis.protectedParts.join(", ")}</p>
                             </div>
                             <div>
                               <span className="text-[10px] text-green-400 font-bold uppercase">Open / Prior Art</span>
                               <p className="text-xs text-gray-400 mt-1">{state.legalAnalysis.unprotectedParts.join(", ")}</p>
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto pt-6 border-t border-white/10">
                           <div className="text-xs text-gray-500 font-mono animate-pulse">Running infringement analysis...</div>
                        </div>
                      )}
                   </div>
                </div>

                {/* 3D WORKBENCH */}
                <div className="lg:col-span-6 flex flex-col">
                   <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl relative flex-1 min-h-[500px] border border-white/10 bg-black/40">
                      {state.meshyModelUrl ? (
                         <MeshyViewer 
                            key={state.meshyModelUrl}
                            modelUrl={state.meshyModelUrl} 
                            legalData={state.legalAnalysis}
                         />
                      ) : state.isMeshyGenerating ? (
                         <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="text-center">
                               <p className="text-blue-400 font-bold tracking-widest text-xs uppercase">Generating 3D Geometry</p>
                               <p className="text-gray-500 text-xs mt-1">Powered by Meshy.ai</p>
                            </div>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 opacity-60">
                             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                             </div>
                             <p className="text-gray-400 font-mono text-xs uppercase">Select a figure above to generate<br/>an interactive 3D model</p>
                         </div>
                      )}
                   </div>
                </div>

                {/* TEXT DETAILS */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass-panel rounded-3xl p-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Technical Abstract</h3>
                      <p className="text-sm text-gray-400 leading-relaxed italic border-l-2 border-gray-700 pl-4">{state.analysis.abstract}</p>
                   </div>
                   <div className="glass-panel rounded-3xl p-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Key Components</h3>
                      <div className="flex flex-wrap gap-2">
                        {state.analysis.keyComponents.map((comp, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-mono text-gray-300 border border-white/10">{comp}</span>
                        ))}
                      </div>
                   </div>
                </div>

                {/* VIDEO GENERATION */}
                <div className="lg:col-span-12 mt-8">
                   {!state.videoUrl && !state.isVideoGenerating && (
                      <div className="glass-panel rounded-3xl p-1 bg-gradient-to-b from-white/10 to-transparent">
                        <button onClick={handleGenerateVideo} className="w-full py-16 rounded-[20px] bg-black/40 hover:bg-black/60 border border-white/5 flex flex-col items-center justify-center gap-4 transition-all group cursor-pointer">
                          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-1">Generate 3D Simulation (Veo 3.1)</h3>
                            <p className="text-sm text-gray-400">Render a high-fidelity functional walkthrough video</p>
                          </div>
                        </button>
                      </div>
                   )}
                   {state.isVideoGenerating && (
                      <div className="glass-panel rounded-3xl p-24 flex flex-col items-center justify-center space-y-8">
                        <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-2xl font-bold text-white mb-2">Synthesizing Physical Logic</h3>
                          <p className="text-gray-400">Rendering frame-by-frame simulation...</p>
                        </div>
                      </div>
                   )}
                   {state.videoUrl && (
                      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                        <div className="aspect-video w-full bg-black relative group">
                          <video src={state.videoUrl} controls autoPlay loop className="w-full h-full" />
                        </div>
                        <div className="p-8 flex items-center justify-between bg-black/40 backdrop-blur-md">
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Generated Prompt</div>
                            <p className="text-sm text-gray-300 italic max-w-2xl truncate">{state.analysis.visualPrompt}</p>
                          </div>
                          <a href={state.videoUrl} download className="px-6 py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors">Download MP4</a>
                        </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress { 0% { width: 0%; transform: translateX(-100%); } 50% { width: 100%; transform: translateX(0%); } 100% { width: 0%; transform: translateX(100%); } }
        .animate-progress { animation: progress 2s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </Layout>
  );
};

export default App;
