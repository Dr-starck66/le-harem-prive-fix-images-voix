
import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION, DEFAULT_VOICE_CONFIG, PERSONAS } from "./constants";
import { generateSingleImage } from "./utils/storageUtils";

export interface LilithResponse {
  text: string;
  audioBase64?: string;
}

export class LilithEngine {
  constructor() {}

  async ask(prompt: string): Promise<LilithResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const textResult = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1.0 
      },
    });

    const text = textResult.text || "";

    let audioBase64: string | undefined;
    try {
      const audioResult = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `[ASMR WHISPER] : ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE_CONFIG.voiceName } },
          },
        },
      });
      audioBase64 = audioResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    } catch (e) {
      console.warn("TTS Failed", e);
    }

    return { text, audioBase64 };
  }

  /**
   * Génère un portrait de Lilith via le moteur Flux.
   */
  async generatePortrait(): Promise<string | null> {
    const lilithPersona = PERSONAS.find(p => p.id === 'lilith');
    if (!lilithPersona) return null;
    const res = await generateSingleImage(lilithPersona, 0);
    return res.data;
  }
}
