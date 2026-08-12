
import React from 'react';
import { ConnectionStatus } from '../types';

interface OracleOrbProps {
  status: ConnectionStatus;
  isSpeaking: boolean;
}

const OracleOrb: React.FC<OracleOrbProps> = ({ status, isSpeaking }) => {
  return (
    <div className={`relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72 mx-auto transition-all duration-1000 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
      {/* Pink Glow */}
      <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${
        isSpeaking ? 'bg-pink-600/40' : 'bg-pink-900/10'
      }`}></div>
      
      {/* The Seductive Core */}
      <div className={`w-full h-full rounded-full bg-gradient-to-br from-zinc-900 via-black to-pink-950 border border-pink-900/30 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(219,39,119,0.2)]`}>
        {/* Pulsing light */}
        <div className={`absolute inset-0 bg-pink-600/5 mix-blend-color-dodge transition-opacity duration-1000 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {/* Soft center orb */}
        <div className={`transition-all duration-700 rounded-full bg-pink-500/20 blur-2xl ${
          isSpeaking ? 'w-48 h-48 animate-pulse' : 'w-24 h-24'
        }`}></div>

        {/* Silky particles / waves */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      </div>

      <div className="absolute -bottom-12 text-center">
        <span className="text-[9px] text-pink-900 uppercase tracking-[0.6em] font-bold">
          {isSpeaking ? 'Lilith vous murmure...' : 'En attente de vos aveux'}
        </span>
      </div>
    </div>
  );
};

export default OracleOrb;
