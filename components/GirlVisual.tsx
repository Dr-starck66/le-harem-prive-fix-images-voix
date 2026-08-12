
import React from 'react';
import { Persona } from '../types';

interface GirlVisualProps {
  persona: Persona;
  isSpeaking: boolean;
  imageUrl: string | null;
  isLoading: boolean;
  imageIndex: number;
  onNextImage: () => void;
  onPrevImage: () => void;
  onGenerateManual: () => void;
}

const GirlVisual: React.FC<GirlVisualProps> = ({ 
  persona, 
  isSpeaking, 
  imageUrl, 
  isLoading, 
  imageIndex,
  onNextImage,
  onPrevImage
}) => {
  // Déterminer si on est sur une pose "Luxe Sensuel Level 15" (index 12, 13, 14)
  const isLevel15 = imageIndex >= 12;

  return (
    <div className="relative flex flex-col items-center w-full max-w-[460px] mx-auto transition-all duration-1000 group">
      {/* Halo Charnel */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] rounded-full blur-[120px] transition-all duration-[2000ms] ${isSpeaking ? 'opacity-80 scale-110' : 'opacity-20 scale-100'}`}
        style={{ backgroundColor: persona.theme.accent }}
      ></div>
      
      <div className={`relative w-full aspect-[4/5] rounded-[50px] border-[2px] border-white/5 overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.95)] bg-zinc-950 transition-all duration-1000 ${isSpeaking ? 'scale-[1.03] border-red-600/50 shadow-[0_0_80px_rgba(220,38,38,0.3)]' : ''}`}>
        
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={imageUrl} 
              alt={persona.name} 
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallback !== "1") {
                  img.dataset.fallback = "1";
                  const prompt = persona.imagePrompts[imageIndex] || persona.dna;
                  const seed = persona.seedMaster + imageIndex;
                  img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=960&nologo=true&seed=${seed}&model=flux`;
                }
              }}
              className={`w-full h-full object-cover transition-all duration-[6000ms] ${isSpeaking ? 'scale-110 brightness-110 saturate-[1.1]' : 'scale-100 brightness-75'}`}
            />
            {/* Vignetage sensuel */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-red-950/20 transition-opacity duration-1000 ${isSpeaking ? 'opacity-70' : 'opacity-40'}`}></div>
            
            {/* Badge Level 15 Ultra Intensity */}
            {isLevel15 && (
              <div className="absolute top-8 right-8 z-20">
                <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.9)] animate-pulse uppercase tracking-[0.3em] border border-white/20">
                  Luxe Sensuel Level 15
                </div>
              </div>
            )}

            {/* Status */}
            <div className="absolute top-8 left-8">
               {isSpeaking ? (
                 <div className="flex items-center gap-3 bg-red-600/80 backdrop-blur-xl px-5 py-2 rounded-full border border-white/20 animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                   <p className="text-[10px] text-white font-black uppercase tracking-widest">ELLE VOUS RÉPOND</p>
                 </div>
               ) : (
                 <div className="bg-black/60 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10">
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em]">À VOTRE ÉCOUTE</p>
                 </div>
               )}
            </div>

            {/* Navigation Poses */}
            <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <button onClick={onPrevImage} className="p-4 rounded-full bg-black/50 backdrop-blur-2xl text-white hover:bg-red-600 transition-all transform hover:scale-110 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button onClick={onNextImage} className="p-4 rounded-full bg-black/50 backdrop-blur-2xl text-white hover:bg-red-600 transition-all transform hover:scale-110 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>

            {/* Barre de poses (15 points de synchronisation) */}
            <div className="absolute bottom-6 left-10 right-10 flex justify-center gap-1.5">
               {Array.from({length: 15}).map((_, idx) => (
                 <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === imageIndex ? 'w-8 bg-red-600 shadow-[0_0_10px_#dc2626]' : (idx >= 12 ? 'w-1 bg-amber-500/40' : 'w-1 bg-white/10')}`}></div>
               ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-16 text-center space-y-8 bg-zinc-950">
             <div className="w-24 h-24 border-4 border-red-600/10 border-t-red-600 rounded-full animate-spin"></div>
             <div className="space-y-2">
               <p className="text-red-600 font-cinzel text-lg tracking-[0.4em] animate-pulse uppercase">Incarnation de {persona.name}...</p>
               <p className="text-zinc-700 text-[10px] uppercase font-black tracking-widest">Génération Backend Active</p>
               {isLevel15 && <p className="text-amber-500 text-[9px] uppercase font-bold animate-pulse">Intensité Level 15 en cours...</p>}
             </div>
          </div>
        )}
      </div>

      <div className="mt-12 text-center w-full">
        <h2 className="font-cinzel text-6xl tracking-[0.2em] mb-3 uppercase text-white drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">
          {persona.name}
        </h2>
        <p className="text-[12px] uppercase tracking-[0.6em] text-red-700 font-black mb-6">{persona.archetype}</p>
        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-red-600/30 to-transparent mx-auto mb-8"></div>
        <p className="text-zinc-500 font-playfair italic max-w-lg mx-auto text-2xl leading-relaxed">"{persona.description}"</p>
      </div>
    </div>
  );
};

export default GirlVisual;
