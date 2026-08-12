
import React from 'react';
import { ConnectionStatus } from '../types';

interface MayaVisualProps {
  status: ConnectionStatus;
  isSpeaking: boolean;
  imageUrl: string | null;
}

const MayaVisual: React.FC<MayaVisualProps> = ({ status, isSpeaking, imageUrl }) => {
  return (
    <div className={`relative flex items-center justify-center w-72 h-72 md:w-96 md:h-96 mx-auto transition-all duration-1000 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
      {/* Glow doré doux */}
      <div className={`absolute inset-0 rounded-full blur-[100px] transition-all duration-1000 ${
        isSpeaking ? 'bg-amber-200/30 opacity-80' : 'bg-amber-100/10 opacity-30'
      }`}></div>
      
      <div className={`relative w-full h-full rounded-full border border-amber-200/20 overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.1)] bg-zinc-900 flex items-center justify-center`}>
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={imageUrl} 
              alt="Maya" 
              className={`w-full h-full object-cover transition-all duration-[3000ms] ${
                isSpeaking ? 'scale-110 saturate-110 brightness-105' : 'scale-100 saturate-100 brightness-90'
              }`}
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-amber-100/10 mix-blend-soft-light`}></div>
            {isSpeaking && (
              <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
             <div className="w-32 h-32 rounded-full bg-amber-100/20 blur-2xl animate-pulse"></div>
             <span className="text-[10px] text-amber-900 animate-pulse tracking-widest uppercase">Maya s'apprête...</span>
          </div>
        )}
      </div>

      <div className="absolute -bottom-14 text-center w-full">
        <span className={`text-[10px] uppercase tracking-[0.6em] font-medium transition-colors duration-500 ${isSpeaking ? 'text-amber-600' : 'text-zinc-600'}`}>
          {isSpeaking ? 'À vos ordres...' : 'En attente de vos instructions'}
        </span>
      </div>
    </div>
  );
};

export default MayaVisual;
