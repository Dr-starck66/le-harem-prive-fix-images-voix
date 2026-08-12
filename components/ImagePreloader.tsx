
import React, { useEffect, useState } from 'react';
import { PERSONAS } from '../constants';
import { getGeneratedImageUrl } from '../utils/storageUtils';

interface ImagePreloaderProps {
  imagesMap: Record<string, string[]>;
  currentPersonaId: string;
}

const ImagePreloader: React.FC<ImagePreloaderProps> = ({ imagesMap, currentPersonaId }) => {
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Stratégie de pré-chargement intelligente :
    // 1. La fille actuelle (12 images)
    // 2. La fille précédente et suivante dans la liste
    const currentIndex = PERSONAS.findIndex(p => p.id === currentPersonaId);
    const neighbors = [
      PERSONAS[(currentIndex - 1 + PERSONAS.length) % PERSONAS.length].id,
      PERSONAS[(currentIndex + 1) % PERSONAS.length].id
    ];

    const targetIds = [currentPersonaId, ...neighbors];
    const imagesToPreload: string[] = [];

    targetIds.forEach(id => {
      const persona = PERSONAS.find(p => p.id === id);
      if (!persona) return;

      if (imagesMap[id]) {
        imagesToPreload.push(...imagesMap[id].filter(img => img !== null));
      }

      // Même si le cache est vide, précharge les premières poses directement
      // depuis le générateur distant afin que le prochain changement soit instantané.
      for (let i = 0; i < 4; i++) {
        if (!imagesMap[id]?.[i]) imagesToPreload.push(getGeneratedImageUrl(persona, i));
      }
    });

    imagesToPreload.forEach(url => {
      if (!preloadedUrls.has(url)) {
        const img = new Image();
        img.src = url;
        (img as any).decoding = 'async'; 
        img.onload = () => {
          setPreloadedUrls(prev => new Set(prev).add(url));
        };
      }
    });

    // Nettoyage périodique pour éviter l'explosion de la RAM
    if (preloadedUrls.size > 150) {
      setPreloadedUrls(new Set());
    }
  }, [imagesMap, currentPersonaId]);

  return (
    <div className="fixed opacity-0 pointer-events-none w-1 h-1 overflow-hidden" aria-hidden="true">
      {Array.from(preloadedUrls).map((url, idx) => (
        <img key={idx} src={url} alt="" />
      ))}
    </div>
  );
};

export default ImagePreloader;
