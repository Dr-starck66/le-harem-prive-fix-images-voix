
import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION, DEFAULT_VOICE_CONFIG, PERSONAS } from "./constants";
import { generateSingleImage } from "./utils/storageUtils";

export interface MayaResponse {
  text: string;
  audioBase64?: string;
}

export class MayaEngine {
  constructor() {}

  async ask(prompt: string): Promise<MayaResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const textResult = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.9 
      },
    });

    const text = textResult.text || "";

    let audioBase64: string | undefined;
    try {
      const audioResult = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `[SWEET WHISPER] : ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
      });
      audioBase64 = audioResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    } catch (e) {
      console.warn("TTS Failed", e);
    }

    return { text, audioBase64 };
  }

  async generatePortrait(): Promise<string | null> {
    const mayaPersona = PERSONAS.find(p => p.id === 'maya');
    if (!mayaPersona) return null;
    const res = await generateSingleImage(mayaPersona, 0);
    return res.data;
  }
}
