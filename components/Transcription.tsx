
import React, { useEffect, useRef } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionProps {
  history: TranscriptionEntry[];
}

const Transcription: React.FC<TranscriptionProps> = ({ history }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 bg-transparent space-y-16 pb-20">
      {history.map((entry, idx) => (
        <div 
          key={idx} 
          className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-8 duration-700`}
        >
          <div className={`flex items-center gap-3 mb-4 ${entry.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.4em] ${entry.role === 'user' ? 'text-zinc-600' : 'text-red-600'}`}>
              {entry.name}
            </span>
            <div className={`h-[1px] w-8 ${entry.role === 'user' ? 'bg-zinc-800' : 'bg-red-900/40'}`}></div>
          </div>
          
          <p className={`text-xl md:text-3xl leading-relaxed font-playfair tracking-tight ${entry.role === 'user' ? 'text-zinc-500 italic text-right' : 'text-white'}`}>
            {entry.text}
          </p>
        </div>
      ))}
      <div ref={bottomRef} className="h-20" />
    </div>
  );
};

export default Transcription;
