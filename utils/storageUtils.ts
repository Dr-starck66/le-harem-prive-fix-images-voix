import { Persona, PersonaId } from "../types";
import JSZip from "jszip";

const DB_NAME = "HaremFluxDB";
const STORE_NAME = "images";
const DB_VERSION = 7;
const IMAGE_COUNT = 15;
const MAX_WORKERS = 3;

export function getGeneratedImageUrl(persona: Persona, index: number): string {
  const prompt = persona.imagePrompts[index] || `${persona.dna}, cinematic portrait`;
  const seed = persona.seedMaster + index;
  const encoded = encodeURIComponent(prompt);
  const key = (import.meta as any).env?.VITE_POLLINATIONS_API_KEY;
  // Pollinations migrated generation to gen.pollinations.ai and now requires auth.
  // Keep the legacy endpoint as a compatibility fallback for older/free deployments.
  if (key && key !== "PLACEHOLDER_POLLINATIONS_KEY") {
    return `https://gen.pollinations.ai/image/${encoded}?width=768&height=960&seed=${seed}&model=flux&key=${encodeURIComponent(key)}`;
  }
  return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=960&nologo=true&seed=${seed}&model=flux`;
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveImage(personaId: string, index: number, data: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, `${personaId}_${index}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Image save failed"));
  });
}

export async function getImage(personaId: string, index: number): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(`${personaId}_${index}`);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}

export async function countTotalStoredImages(): Promise<number> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function getAllStoredImages(): Promise<Record<string, string[]>> {
  const imagesMap: Record<string, string[]> = {};
  try {
    const db = await openDB();
    const entries = await new Promise<Array<[string, string]>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const result: Array<[string, string]> = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve(result);
        if (typeof cursor.value === "string") result.push([String(cursor.key), cursor.value]);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });

    for (const [key, data] of entries) {
      const split = key.lastIndexOf("_");
      if (split < 1) continue;
      const personaId = key.slice(0, split);
      const index = Number(key.slice(split + 1));
      if (!Number.isInteger(index) || index < 0 || index >= IMAGE_COUNT) continue;
      if (!imagesMap[personaId]) imagesMap[personaId] = new Array(IMAGE_COUNT).fill(null);
      imagesMap[personaId][index] = data;
    }
  } catch (error) {
    console.warn("Image cache unavailable:", error);
  }
  return imagesMap;
}

export async function generateSingleImage(
  persona: Persona,
  index: number,
  retryCount = 0
): Promise<{ data: string | null; error?: string }> {
  if (retryCount >= 3) return { data: null, error: "Image generation failed" };

  const url = getGeneratedImageUrl(persona, index);
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/png,image/*" }
    });
    window.clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.startsWith("image/")) {
      throw new Error(`Image endpoint returned ${res.status} ${contentType}`);
    }

    const blob = await res.blob();
    if (blob.size < 10000) throw new Error("Image response too small");

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });

    await saveImage(persona.id, index, base64);
    return { data: base64 };
  } catch (error) {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
      return generateSingleImage(persona, index, retryCount + 1);
    }
    console.warn(`Image ${persona.name}/${index + 1} failed`, error);
    return { data: null, error: String(error) };
  }
}

type Task = { p: Persona; idx: number };

let queue: Task[] = [];
let running = 0;
let initialized = false;
const queuedKeys = new Set<string>();
const runningKeys = new Set<string>();

const keyOf = (t: Task) => `${t.p.id}_${t.idx}`;

function enqueue(tasks: Task[], front = false) {
  const fresh: Task[] = [];
  for (const task of tasks) {
    const k = keyOf(task);
    if (queuedKeys.has(k) || runningKeys.has(k)) {
      if (front && queuedKeys.has(k) && !runningKeys.has(k)) {
        queue = queue.filter(q => keyOf(q) !== k);
        queue.unshift(task);
      }
      continue;
    }
    queuedKeys.add(k);
    fresh.push(task);
  }
  if (fresh.length) queue = front ? [...fresh, ...queue] : [...queue, ...fresh];
}

async function worker(
  onProgress?: (totalCount: number, lastLoaded?: { personaId: string; index: number; data: string }) => void
) {
  while (true) {
    const task = queue.shift();
    if (!task) break;
    const k = keyOf(task);
    queuedKeys.delete(k);
    runningKeys.add(k);
    running++;

    try {
      const existing = await getImage(task.p.id, task.idx);
      if (!existing) {
        const result = await generateSingleImage(task.p, task.idx);
        if (result.data) {
          onProgress?.(
            await countTotalStoredImages(),
            { personaId: task.p.id, index: task.idx, data: result.data }
          );
        }
      } else {
        onProgress?.(await countTotalStoredImages());
      }
    } catch (error) {
      console.warn("Image worker error:", error);
    } finally {
      runningKeys.delete(k);
      running--;
    }
  }
}

export async function storeAllImages(
  personas: Persona[],
  onProgress?: (totalCount: number, lastLoaded?: { personaId: string; index: number; data: string }) => void,
  priorityId?: PersonaId,
  priorityIdx?: number
): Promise<void> {
  const priorityPersona = priorityId ? personas.find(p => p.id === priorityId) : undefined;

  if (!initialized) {
    initialized = true;
    // Do not block the UI with 795 sequential downloads.
    // Build the complete background queue once, then prioritize the visible poses.
    enqueue(personas.flatMap(p => Array.from({ length: IMAGE_COUNT }, (_, idx) => ({ p, idx }))));
  }

  if (priorityPersona) {
    const visibleIndices = Array.from(
      new Set([
        priorityIdx ?? 0,
        ((priorityIdx ?? 0) + 1) % IMAGE_COUNT,
        ((priorityIdx ?? 0) + 2) % IMAGE_COUNT,
        ((priorityIdx ?? 0) + IMAGE_COUNT - 1) % IMAGE_COUNT
      ])
    );
    enqueue(visibleIndices.map(idx => ({ p: priorityPersona, idx })), true);
  }

  const workers = Math.min(MAX_WORKERS, Math.max(0, MAX_WORKERS - running));
  await Promise.all(
    Array.from({ length: workers }, () => worker(onProgress))
  );
}

export async function exportImagesAsJson() {
  const images = await getAllStoredImages();
  const blob = new Blob([JSON.stringify(images)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `harem_vault_${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function exportImagesAsHtml(personas: Persona[]) {
  const images = await getAllStoredImages();
  let h = `<html><head><title>Votre Harem Privé</title><style>body{background:#000;color:#fff;font-family:sans-serif;padding:40px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}img{width:100%;border-radius:15px;border:1px solid #333}h2{border-bottom:1px solid #dc2626;padding-bottom:10px;margin-top:60px;color:#dc2626;text-transform:uppercase;letter-spacing:4px}</style></head><body>`;
  h += `<h1>Archives du Harem Privé</h1>`;
  personas.forEach(p => {
    const photos = images[p.id]?.filter(Boolean);
    if (photos?.length) {
      h += `<h2>${p.name} - ${p.archetype}</h2><div class="grid">`;
      photos.forEach(img => h += `<img loading="lazy" src="${img}">`);
      h += `</div>`;
    }
  });
  h += `</body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([h], { type: "text/html" }));
  a.download = "harem_galerie_privee.html";
  a.click();
}

export async function exportImagesAsZip(personas: Persona[]) {
  const zip = new JSZip();
  const images = await getAllStoredImages();
  for (const p of personas) {
    const photos = images[p.id];
    if (!photos) continue;
    const f = zip.folder(p.name);
    photos.forEach((img, i) => {
      if (img) f?.file(`pose_${i + 1}.png`, img.split(",")[1], { base64: true });
    });
  }
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = "harem_complet_archive.zip";
  a.click();
}
