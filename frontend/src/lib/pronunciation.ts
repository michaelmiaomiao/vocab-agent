export type PronunciationAccent = "en-US" | "en-GB";

export interface SpeakTextOptions {
  lang?: PronunciationAccent;
  onEnd?: () => void;
  onError?: () => void;
}

function getSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis;
}

export function supportsPronunciation() {
  return Boolean(getSpeechSynthesis() && "SpeechSynthesisUtterance" in window);
}

export function stopSpeaking() {
  const synthesis = getSpeechSynthesis();
  if (!synthesis) {
    return;
  }

  synthesis.cancel();
}

export function speakText(text: string, options: SpeakTextOptions = {}) {
  const synthesis = getSpeechSynthesis();
  const trimmed = text.trim();

  if (!synthesis || !trimmed || !("SpeechSynthesisUtterance" in window)) {
    return false;
  }

  synthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = options.lang ?? "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onError?.();

  synthesis.speak(utterance);
  return true;
}
