
import React, { useRef, useState } from 'react';
import { Persona, PersonaId } from '../types';

interface PersonaSelectorProps {
  personas: Persona[];
  currentId: PersonaId;
  imagesMap: Record<string, string>;
  onSelect: (id: PersonaId) => void;
  disabled: boolean;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ personas, currentId, imagesMap, onSelect, disabled }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFullGrid, setShowFullGrid] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <>
      {showFullGrid && (
        <div className="fixed inset-0 z-[150] bg-black/98 backdrop-blur-3xl p-8 overflow-y-auto animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-16">
              <div className="space-y-2">
                <h2 className="font-cinzel text-5xl text-red-600 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Le Grand Harem</h2>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.5em] font-black">Prenez possession d'une de vos 53 favorites</p>
              </div>
              <button 
                onClick={() => setShowFullGrid(false)}
                className="p-6 bg-red-600/10 hover:bg-red-600 rounded-full transition-all group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-white group-hover:scale-125 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8 pb-32">
              {personas.map((p) => {
                const isSelected = currentId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { onSelect(p.id); setShowFullGrid(false); }}
                    className={`group relative aspect-[3/4] rounded-[35px] overflow-hidden bg-zinc-900 border-2 transition-all duration-700 ${isSelected ? 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.5)] scale-105' : 'border-white/5 hover:border-red-600/30'}`}
                  >
                    {imagesMap[p.id] ? (
                      <img src={imagesMap[p.id]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                        <span className="text-5xl text-zinc-900 font-cinzel font-black animate-pulse">{p.name[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    <div className="absolute bottom-0 left-0 w-full p-6 text-center">
                      <p className="text-[11px] text-white font-black uppercase tracking-[0.2em] drop-shadow-lg">{p.name}</p>
                      <p className="text-[7px] text-red-600 font-bold uppercase tracking-widest mt-1">{p.archetype.split(' ')[1]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full z-40 px-4 pb-8 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center p-3 bg-zinc-950/95 backdrop-blur-3xl rounded-[45px] border border-white/10 shadow-[0_-40px_100px_rgba(0,0,0,0.95)] pointer-events-auto relative">
          
          <button 
            onClick={() => setShowFullGrid(true)}
            className="flex-shrink-0 w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-[25px] flex items-center justify-center transition-all mr-3 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 group"
            title="Toutes mes Favorites (53)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 group-hover:rotate-90 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
            </svg>
          </button>

          <button onClick={() => scroll('left')} className="w-10 h-10 hover:bg-white/5 text-zinc-600 rounded-full flex items-center justify-center transition-all md:flex hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          
          <div ref={scrollRef} className="flex flex-grow overflow-x-auto gap-4 py-3 px-2 no-scrollbar custom-scrollbar-h scroll-smooth">
            {personas.map((p) => {
              const isSelected = currentId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  disabled={disabled}
                  className={`relative flex-shrink-0 transition-all duration-700 ${isSelected ? 'scale-115' : 'opacity-30 hover:opacity-100'}`}
                >
                  <div className={`w-16 h-16 rounded-[24px] border-2 transition-all overflow-hidden bg-zinc-900 ${isSelected ? 'border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.6)]' : 'border-white/5'}`}>
                    {imagesMap[p.id] ? (
                      <img src={imagesMap[p.id]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-red-600 font-cinzel font-bold">{p.name[0]}</div>
                    )}
                  </div>
                  {isSelected && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 border-2 border-zinc-950 animate-pulse"></div>}
                </button>
              );
            })}
          </div>

          <button onClick={() => scroll('right')} className="w-10 h-10 hover:bg-white/5 text-zinc-600 rounded-full flex items-center justify-center transition-all md:flex hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default PersonaSelector;
