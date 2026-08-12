
import React from 'react';

const ApiDocs: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-zinc-950 border border-pink-900/40 rounded-2xl p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-cinzel text-2xl text-pink-500">Intégration API Lilith</h2>
          <button onClick={onClose} className="text-pink-900 hover:text-pink-500">Fermer</button>
        </div>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="text-pink-700 font-bold mb-2 uppercase tracking-tighter">Usage Direct (SDK)</h3>
            <pre className="bg-black p-4 rounded border border-pink-900/20 text-pink-200/60 overflow-x-auto">
{`import { LilithEngine } from './lilithEngine';

const lilith = new LilithEngine(process.env.API_KEY);

// Obtenir une réponse sensuelle
const { text, audioBase64 } = await lilith.ask("Dis-moi quelque chose d'osé...");

// Obtenir son portrait
const imageUrl = await lilith.generatePortrait();`}
            </pre>
          </section>

          <section>
            <h3 className="text-pink-700 font-bold mb-2 uppercase tracking-tighter">Structure des Données</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black p-4 border border-pink-900/10 rounded">
                <p className="text-pink-500 font-bold">Modèle Texte</p>
                <p className="text-zinc-500">gemini-3-flash-preview</p>
              </div>
              <div className="bg-black p-4 border border-pink-900/10 rounded">
                <p className="text-pink-500 font-bold">Modèle Voix</p>
                <p className="text-zinc-500">gemini-2.5-flash-preview-tts (Kore)</p>
              </div>
            </div>
          </section>

          <p className="italic text-zinc-600">Note: Pour un usage en backend, portez la logique de lilithEngine.ts vers un serveur Node.js et exposez des endpoints REST.</p>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
