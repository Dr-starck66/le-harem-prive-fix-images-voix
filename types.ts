
export interface TranscriptionEntry {
  role: 'user' | 'girl';
  name: string;
  text: string;
  timestamp: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export type PersonaId = string;

export interface Persona {
  id: PersonaId;
  name: string;
  archetype: string;
  description: string;
  profession: string;
  location: string;
  instruction: string;
  secret: string;
  power: string;
  vulnerability: string;
  ritualQuestions: string[];
  traits: {
    sensuality: number;
    confidence: number;
    mystery: number;
    intelligence: number;
  };
  theme: {
    bg: string;
    accent: string;
    text: string;
    secondary: string;
  };
  voiceName: 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Aoede';
  imagePrompts: string[]; 
  animationStyle: 'pulse' | 'glitch' | 'heat' | 'float' | 'sparkle' | 'vibrate' | 'breath';
  
  // Character Consistency Engine Attributes
  seedMaster: number;
  embeddings: {
    face: string;
    style: string;
  };
  memory: {
    wardrobe: string[];
    personality: string[];
    conversation: string[];
  };
}
