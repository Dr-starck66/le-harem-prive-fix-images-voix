
import React from 'react';
import { ConnectionStatus } from '../types';

interface LilithVisualProps {
  status: ConnectionStatus;
  isSpeaking: boolean;
  imageUrl: string | null;
}

const LilithVisual: React.FC<LilithVisualProps> = ({ status, isSpeaking, imageUrl }) => {
  return (
    <div className={`relative flex items-center justify-center w-72 h-72 md:w-96 md:h-96 mx-auto transition-all duration-1000 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
      {/* Halo de lumière pulsant */}
      <div className={`absolute inset-0 rounded-full blur-[100px] transition-all duration-1000 ${
        isSpeaking ? 'bg-pink-600/40 opacity-80' : 'bg-pink-900/10 opacity-30'
      }`}></div>
      
      {/* Conteneur principal */}
      <div className={`relative w-full h-full rounded-2xl border border-pink-900/30 overflow-hidden shadow-[0_0_80px_rgba(219,39,119,0.2)] bg-black flex items-center justify-center`}>
        
        {/* Image de Lilith générée par l'IA */}
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={imageUrl} 
              alt="Lilith" 
              className={`w-full h-full object-cover transition-all duration-[2000ms] ${
                isSpeaking ? 'scale-110 brightness-110 saturate-125' : 'scale-100 brightness-75 saturate-100'
              }`}
            />
            {/* Overlay de fumée et de lueur */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-pink-950/20 mix-blend-overlay transition-opacity duration-1000 ${isSpeaking ? 'opacity-100' : 'opacity-40'}`}></div>
            
            {/* Effet de "glitch" sensuel quand elle parle */}
            {isSpeaking && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-pink-500/10 animate-pulse mix-blend-screen"></div>
              </div>
            )}
          </div>
        ) : (
          /* Placeholder / Orb si l'image n'est pas encore chargée */
          <div className="flex flex-col items-center justify-center space-y-4">
             <div className={`w-32 h-32 rounded-full bg-pink-600/20 blur-2xl animate-pulse`}></div>
             <span className="text-[10px] text-pink-900 animate-pulse tracking-widest uppercase">Incarnation en cours...</span>
          </div>
        )}

        {/* Cadre ornemental */}
        <div className="absolute inset-0 border-[1px] border-pink-500/10 pointer-events-none"></div>
      </div>

      <div className="absolute -bottom-14 text-center w-full">
        <span className={`text-[10px] uppercase tracking-[0.6em] font-bold transition-colors duration-500 ${isSpeaking ? 'text-pink-400' : 'text-pink-950'}`}>
          {isSpeaking ? 'Lilith vous possède...' : (status === ConnectionStatus.CONNECTING ? 'Invocation...' : 'Appelez sa présence')}
        </span>
      </div>
    </div>
  );
};

export default LilithVisual;
