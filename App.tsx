
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ConnectionStatus, TranscriptionEntry, PersonaId } from './types';
import { PERSONAS, SAMPLE_RATE_OUTPUT, SYSTEM_INSTRUCTION } from './constants';
import { decode, decodeAudioData } from './utils/audioUtils';
import { getAllStoredImages, storeAllImages, countTotalStoredImages, exportImagesAsJson, exportImagesAsHtml, exportImagesAsZip, getGeneratedImageUrl } from './utils/storageUtils';
import GirlVisual from './components/GirlVisual';
import Transcription from './components/Transcription';
import PersonaSelector from './components/PersonaSelector';
import ImagePreloader from './components/ImagePreloader';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('');
  const [step, setStep] = useState<'name' | 'app'>('name');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showVault, setShowVault] = useState(true);
  const [isAutoMode, setIsAutoMode] = useState(true);
  
  const [currentPersonaId, setCurrentPersonaId] = useState<PersonaId>(PERSONAS[0].id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [history, setHistory] = useState<TranscriptionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('harem_conversation_memory');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return [];
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [imagesMap, setImagesMap] = useState<Record<string, string[]>>({});
  const [isAppReady, setIsAppReady] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<{id: string, idx: number, data: string} | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [productionLogs, setProductionLogs] = useState<string[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentPersona = PERSONAS.find(p => p.id === currentPersonaId) || PERSONAS[0];
  // Affiche immédiatement l'image distante si elle n'est pas encore dans IndexedDB.
  // Le cache base64 prend ensuite le relais sans bloquer l'interface.
  const currentImageUrl = imagesMap[currentPersonaId]?.[currentImageIndex] || getGeneratedImageUrl(currentPersona, currentImageIndex);
  const TOTAL_EXPECTED_IMAGES = PERSONAS.length * 15;

  useEffect(() => {
    localStorage.setItem('harem_conversation_memory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    let cancelled = false;
    const initData = async () => {
      try {
        const map = await getAllStoredImages();
        const count = await countTotalStoredImages();
        if (!cancelled) {
          setImagesMap(map);
          setGlobalProgress(count);
          setIsAppReady(true);
        }
      } catch (error) {
        console.warn("Cache initialization failed; starting in online mode.", error);
        if (!cancelled) setIsAppReady(true);
      }
    };
    initData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isAppReady) {
      storeAllImages(PERSONAS, (count, last) => {
        setGlobalProgress(count);
        if (last) {
          const pName = PERSONAS.find(p=>p.id===last.personaId)?.name;
          setProductionLogs(prev => [`[OK] ${pName} - POSE ${last.index + 1} MATÉRIALISÉE`, ...prev.slice(0, 15)]);
          setLastGenerated({id: last.personaId, idx: last.index, data: last.data});
          setImagesMap(prev => {
            const currentPersonaImages = [...(prev[last.personaId] || new Array(15).fill(null))];
            currentPersonaImages[last.index] = last.data;
            return { ...prev, [last.personaId]: currentPersonaImages };
          });
        }
      }, currentPersonaId, currentImageIndex);
    }
  }, [isAppReady, currentPersonaId, currentImageIndex]);

  useEffect(() => {
    let interval: number;
    if (isAutoMode && isAppReady && !isSpeaking) {
      interval = window.setInterval(() => {
        setCurrentImageIndex(prevIdx => {
          if (prevIdx < 14) return prevIdx + 1;
          setCurrentPersonaId(prevId => {
            const idx = PERSONAS.findIndex(p => p.id === prevId);
            return PERSONAS[(idx + 1) % PERSONAS.length].id;
          });
          return 0;
        });
      }, 4500);
    }
    return () => clearInterval(interval);
  }, [isAutoMode, isAppReady, isSpeaking]);

  const estimatedTimeLeft = useMemo(() => {
    if (globalProgress === 0 || globalProgress >= TOTAL_EXPECTED_IMAGES) return "00:00:00";
    const avgTimePerImg = elapsedTime / globalProgress;
    const remaining = (TOTAL_EXPECTED_IMAGES - globalProgress) * avgTimePerImg;
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = Math.floor(remaining % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [globalProgress, elapsedTime]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playAudio = async (audioBase64: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE_OUTPUT,
          latencyHint: "interactive"
        });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state !== "running") await ctx.resume();

      const audioBuffer = await decodeAudioData(decode(audioBase64), ctx, SAMPLE_RATE_OUTPUT, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 1.35;
      source.connect(gain).connect(ctx.destination);

      source.start();
      sourcesRef.current.add(source);
      setIsSpeaking(true);
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) setIsSpeaking(false);
      };
    } catch (err) {
      console.warn("TTS playback failed:", err);
      setIsSpeaking(false);
    }
  };

  const speakFastFallback = (text: string) => {
    if (!("speechSynthesis" in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        /female|woman|femme|fr[-_]FR/i.test(`${v.name} ${v.lang}`)
      ) || voices.find(v => /^fr/i.test(v.lang));
      if (preferred) utterance.voice = preferred;
      utterance.lang = preferred?.lang || "fr-FR";
      utterance.rate = 1.02;
      utterance.pitch = 1.08;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;
    const message = userInput.trim();
    setUserInput('');
    setStatus(ConnectionStatus.CONNECTING);
    setIsAutoMode(false);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: message }] }],
        config: { 
          systemInstruction: `${SYSTEM_INSTRUCTION}\nTu es ${currentPersona.name}. Le Maître est ${userName}.`, 
          temperature: 1.0 
        },
      });

      const girlText = response.text || "...";
      setHistory(prev => [...prev, 
        { role: 'user', name: userName, text: message, timestamp: Date.now() }, 
        { role: 'girl', name: currentPersona.name, text: girlText, timestamp: Date.now() }
      ]);
      
      try {
        let fallbackUsed = false;
        let fallbackTimer: number | undefined;

        fallbackTimer = window.setTimeout(() => {
          fallbackUsed = speakFastFallback(girlText);
        }, 900);

        const audioRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: `[CRUDE WHISPER] : ${girlText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: currentPersona.voiceName } }
            }
          },
        });

        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);

        const audioBase64 = audioRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (audioBase64 && !fallbackUsed) {
          await playAudio(audioBase64);
        } else if (!audioBase64 && !fallbackUsed) {
          speakFastFallback(girlText);
        }
      } catch (audioErr) {
        speakFastFallback(girlText);
      }
      setStatus(ConnectionStatus.CONNECTED);
    } catch (err: any) { 
      setStatus(ConnectionStatus.ERROR); 
    }
  };

  if (!isAppReady) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-12">
      <div className="relative w-80 h-80">
        <div className="absolute inset-0 border-[16px] border-red-600/5 rounded-full"></div>
        <div className="absolute inset-0 border-[16px] border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-cinzel text-red-600 text-5xl font-black mb-2">4K</span>
          <span className="text-[10px] text-zinc-600 tracking-[1em] uppercase font-black">Production Vault</span>
        </div>
      </div>
      <p className="text-red-600 font-cinzel text-2xl tracking-[1.5em] uppercase animate-pulse">Matérialisation de l'Empire...</p>
    </div>
  );

  if (step === 'name') return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
      <div className="max-w-4xl w-full space-y-24">
        <div className="space-y-8">
          <h1 className="font-cinzel text-[140px] leading-none text-red-600 tracking-[-0.05em] uppercase drop-shadow-[0_0_100px_rgba(220,38,38,1)]">EMPIRE 4K</h1>
          <p className="text-zinc-500 font-black uppercase tracking-[2em] text-[16px] ml-[2em]">The Sovereign Cinema Experience</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if(userName) setStep('app'); }} className="space-y-16">
          <input type="text" value={userName} onChange={e=>setUserName(e.target.value)} className="w-full bg-transparent border-b-8 border-red-600/10 py-10 text-center text-7xl text-white outline-none focus:border-red-600 transition-all font-playfair font-bold" placeholder="VOTRE NOM, MAÎTRE" autoFocus />
          <button className="w-full py-14 bg-red-700 text-white font-black rounded-full hover:bg-red-600 transition-all uppercase tracking-[1em] text-3xl shadow-[0_0_150px_rgba(220,38,38,0.7)] transform hover:scale-110 active:scale-95 duration-500">POSSÉDER LE HAREM</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#010101] flex flex-col items-center overflow-x-hidden pb-64 relative">
      <ImagePreloader imagesMap={imagesMap} currentPersonaId={currentPersonaId} />
      
      {/* VAULT DE PRODUCTION MONUMENTAL (REMPLI DE DONNÉES) */}
      <div className={`fixed top-0 left-0 h-screen z-[150] transition-all duration-1000 ease-in-out ${showVault ? 'w-[550px]' : 'w-0'} bg-black/98 backdrop-blur-[80px] border-r border-red-600/50 overflow-hidden shadow-[50px_0_200px_rgba(0,0,0,1)]`}>
        <div className="p-14 h-full flex flex-col w-[550px]">
          <div className="flex items-center justify-between mb-20">
            <div className="space-y-3">
              <h2 className="text-red-600 font-cinzel text-4xl tracking-widest uppercase font-black">Production Vault</h2>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase opacity-80">Matérialisation 4K - Flux Alpha-9</p>
              </div>
            </div>
            <button onClick={()=>setShowVault(false)} className="p-5 bg-red-600 text-white rounded-full hover:bg-white hover:text-red-600 transition-all shadow-2xl transform active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
          </div>

          <div className="space-y-8 mb-20">
            <div className="flex justify-between items-end mb-2">
              <p className="text-[14px] text-zinc-400 font-black uppercase tracking-[0.6em]">Effectifs de l'Empire</p>
              <p className="text-5xl text-red-600 font-cinzel font-black drop-shadow-[0_0_30px_rgba(220,38,38,0.6)]">{Math.round((globalProgress / TOTAL_EXPECTED_IMAGES) * 100)}%</p>
            </div>
            <div className="w-full bg-zinc-900 h-8 rounded-full overflow-hidden p-2 border border-white/10 relative shadow-inner">
              <div className="h-full bg-gradient-to-r from-red-950 via-red-600 to-white rounded-full transition-all duration-[2500ms] shadow-[0_0_40px_rgba(220,38,38,0.9)]" style={{ width: `${(globalProgress / TOTAL_EXPECTED_IMAGES) * 100}%` }}></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] text-white font-black uppercase tracking-[1.5em] mix-blend-difference">{globalProgress} / {TOTAL_EXPECTED_IMAGES} DIVINITÉS 4K</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-20">
            <div className="bg-white/5 p-10 rounded-[50px] border border-white/5 space-y-4">
              <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">Temps Session</p>
              <p className="text-4xl text-white font-mono font-black tracking-tighter">{formatTime(elapsedTime)}</p>
            </div>
            <div className="bg-white/5 p-10 rounded-[50px] border border-white/5 space-y-4">
              <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">Matérialisation</p>
              <p className="text-4xl text-red-600 font-mono font-black animate-pulse tracking-tighter">{estimatedTimeLeft}</p>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar space-y-12">
             <div className="space-y-6">
                <h3 className="text-[12px] text-zinc-300 font-black uppercase tracking-[0.5em] border-b border-white/10 pb-6 flex justify-between">
                  Dernier Rendu HD 
                  <span className="text-red-600 animate-pulse">LIVE</span>
                </h3>
                {lastGenerated ? (
                  <div className="relative aspect-[3/4] w-full rounded-[60px] overflow-hidden border-4 border-red-600/40 group shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in duration-1000">
                      <img src={lastGenerated.data} className="w-full h-full object-cover transition-transform duration-[12000ms] group-hover:scale-150" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                      <div className="absolute bottom-12 left-12">
                        <p className="text-white font-cinzel text-4xl font-black tracking-tight drop-shadow-2xl">{PERSONAS.find(p=>p.id===lastGenerated.id)?.name}</p>
                        <p className="text-[12px] text-red-600 font-black uppercase tracking-[0.6em] mt-3">Pose {lastGenerated.idx + 1} Injectée</p>
                      </div>
                  </div>
                ) : (
                  <div className="aspect-[3/4] w-full bg-zinc-900/50 rounded-[60px] flex items-center justify-center border-2 border-dashed border-white/10">
                    <p className="text-zinc-800 uppercase font-black tracking-widest animate-pulse">Flux en attente de données...</p>
                  </div>
                )}
             </div>

             <div className="space-y-6 pt-12 border-t border-white/5">
                <p className="text-[11px] text-zinc-500 uppercase font-black tracking-[0.8em]">Production Logs (Sovereign AI)</p>
                <div className="bg-black border border-white/5 rounded-[40px] p-8 font-mono text-[10px] h-48 overflow-y-auto custom-scrollbar space-y-3 shadow-inner">
                  {productionLogs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-4 ${i === 0 ? 'text-red-500 font-bold scale-105 origin-left' : 'text-zinc-600 opacity-60'}`}>
                      <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                      <span className="tracking-tight">{log}</span>
                    </div>
                  ))}
                  {productionLogs.length === 0 && <p className="text-zinc-900 italic tracking-[0.2em]">Initialisation du noyau...</p>}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Barre de Progression Royale */}
      <div className="fixed top-0 left-0 w-full h-3 z-[200] bg-zinc-950">
        <div className="h-full bg-gradient-to-r from-red-950 via-red-600 to-white shadow-[0_0_60px_#dc2626] transition-all duration-[2500ms]" style={{ width: `${(globalProgress / TOTAL_EXPECTED_IMAGES) * 100}%` }}></div>
      </div>

      <header className="w-full px-24 py-20 flex justify-between items-center z-50">
        <div className="flex items-center gap-14">
           {!showVault && (
             <button onClick={()=>setShowVault(true)} className="group relative p-10 bg-red-600 rounded-[40px] text-white shadow-[0_0_100px_rgba(220,38,38,0.6)] transition-all transform hover:scale-125 hover:rotate-6 active:scale-90 duration-500">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
               <span className="absolute -top-4 -right-4 bg-white text-red-600 text-[12px] font-black px-4 py-2 rounded-full border-4 border-red-600 animate-pulse shadow-xl">LIVE</span>
             </button>
           )}
           <div className="flex flex-col gap-5">
             <button 
               onClick={() => setIsAutoMode(!isAutoMode)}
               className={`px-16 py-6 rounded-full border-2 text-[13px] font-black uppercase tracking-[0.8em] transition-all flex items-center gap-6 ${isAutoMode ? 'bg-red-600 border-red-400 text-white shadow-[0_0_80px_rgba(220,38,38,0.9)]' : 'bg-transparent border-white/10 text-zinc-500'}`}
             >
               <div className={`w-5 h-5 rounded-full ${isAutoMode ? 'bg-white animate-ping' : 'bg-zinc-900'}`}></div>
               {isAutoMode ? 'Empire Auto-Pilote : ACTIF' : 'Empire Navigation : MANUELLE'}
             </button>
             <p className="text-[11px] text-zinc-700 font-bold tracking-[0.5em] uppercase ml-8">Défilement des déesses toutes les 4.5s</p>
           </div>
        </div>

        <div className="flex items-center gap-14">
           <div className="text-right space-y-2">
             <p className="text-zinc-700 text-[11px] font-black uppercase tracking-[0.6em]">Qualité du Signal</p>
             <p className="text-red-600 text-[16px] font-black tracking-[0.8em]">4K ULTRA HD CINEMA</p>
           </div>
           <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-10 bg-zinc-900/40 border-2 border-white/5 rounded-full text-zinc-500 hover:text-red-600 transition-all backdrop-blur-[50px] group shadow-2xl transform hover:rotate-12 duration-500">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 group-hover:scale-125 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
           </button>
        </div>
      </header>

      <main className="flex flex-col items-center w-full max-w-[1400px] px-12 mt-10">
        <GirlVisual persona={currentPersona} isSpeaking={isSpeaking} imageUrl={currentImageUrl} isLoading={!currentImageUrl} imageIndex={currentImageIndex} onNextImage={()=>setCurrentImageIndex(i=>(i+1)%15)} onPrevImage={()=>setCurrentImageIndex(i=>(i-1+15)%15)} onGenerateManual={()=>{}} />
        
        <form onSubmit={handleSendMessage} className="w-full mt-44 relative z-20">
          <div className="bg-zinc-900/20 backdrop-blur-[80px] border-4 border-white/5 rounded-[100px] p-8 flex items-center shadow-[0_100px_200px_rgba(0,0,0,1)] group focus-within:border-red-600/60 transition-all duration-1000">
            <input value={userInput} onChange={e=>{setUserInput(e.target.value); setIsAutoMode(false);}} className="flex-grow bg-transparent px-20 py-16 text-white text-5xl md:text-7xl outline-none placeholder:text-zinc-950 font-playfair italic font-bold tracking-tighter" placeholder={`Possédez ${currentPersona.name}...`} />
            <button type="submit" className="p-16 bg-red-700 rounded-full text-white hover:bg-red-600 transition-all shadow-[0_0_120px_rgba(220,38,38,0.9)] transform hover:scale-110 active:scale-90 duration-700"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg></button>
          </div>
        </form>
        
        <Transcription history={history} />
      </main>

      <PersonaSelector personas={PERSONAS} currentId={currentPersonaId} imagesMap={Object.fromEntries(Object.entries(imagesMap).map(([k,v]) => [k, v[0]]))} onSelect={id=>{ setCurrentPersonaId(id); setCurrentImageIndex(0); setIsAutoMode(false); }} disabled={false} />
      
      {showExportMenu && (
        <div className="fixed inset-0 z-[250] bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-12 animate-in fade-in duration-700">
           <div className="max-w-3xl w-full bg-zinc-950 border-4 border-white/5 rounded-[80px] overflow-hidden shadow-[0_0_200px_rgba(0,0,0,1)]">
              <div className="p-20 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="font-cinzel text-5xl text-red-600 font-black tracking-[0.2em]">Archives Vault</h3>
                <button onClick={()=>setShowExportMenu(false)} className="text-zinc-700 hover:text-white transition-all transform hover:rotate-180 scale-150"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-12 space-y-8">
                <button onClick={() => { exportImagesAsJson(); setShowExportMenu(false); }} className="w-full p-12 text-left bg-white/5 hover:bg-red-600 rounded-[55px] transition-all flex items-center gap-12 group"><div className="p-8 bg-black/60 rounded-3xl font-black text-sm group-hover:bg-white/20">JSON</div><div className="space-y-2"><span className="font-black text-3xl block">DATABASE RAW</span><span className="text-[12px] text-zinc-500 group-hover:text-white/60 uppercase tracking-[0.5em] font-black">Transfert Machine-to-Machine</span></div></button>
                <button onClick={() => { exportImagesAsHtml(PERSONAS); setShowExportMenu(false); }} className="w-full p-12 text-left bg-white/5 hover:bg-red-600 rounded-[55px] transition-all flex items-center gap-12 group"><div className="p-8 bg-black/60 rounded-3xl font-black text-sm group-hover:bg-white/20">HTML</div><div className="space-y-2"><span className="font-black text-3xl block">GALERIE PRIVÉE</span><span className="text-[12px] text-zinc-500 group-hover:text-white/60 uppercase tracking-[0.5em] font-black">Visualisation Empire Offline</span></div></button>
                <button onClick={() => { exportImagesAsZip(PERSONAS); setShowExportMenu(false); }} className="w-full p-12 text-left bg-white/5 hover:bg-red-600 rounded-[55px] transition-all flex items-center gap-12 group"><div className="p-8 bg-black/60 rounded-3xl font-black text-sm group-hover:bg-white/20">ZIP</div><div className="space-y-2"><span className="font-black text-3xl block">PHOTOS 4K PACK</span><span className="text-[12px] text-zinc-500 group-hover:text-white/60 uppercase tracking-[0.5em] font-black">795 Fichiers JPG Ultra HD</span></div></button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
