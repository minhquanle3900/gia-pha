import { useCallback, useEffect, useRef, useState } from 'react';
import { getVietnameseVoices, isSpeechSynthesisSupported } from '../services/speechSynthesisService';

export type SpeechPlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface UseSpeechReaderReturn {
  isSupported: boolean;
  status: SpeechPlaybackStatus;
  currentSentenceIndex: number;
  sentences: string[];
  voices: SpeechSynthesisVoice[];
  vietnameseVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  play: (sentencesList: string[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  jumpToSentence: (index: number) => void;
  setRate: (rate: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
}

export function useSpeechReader(): UseSpeechReaderReturn {
  const isSupported = isSpeechSynthesisSupported();

  const [status, setStatus] = useState<SpeechPlaybackStatus>('idle');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [vietnameseVoices, setVietnameseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRateState] = useState<number>(1.0);
  const [pitch] = useState<number>(1.0);

  // Keep refs for active callbacks and utterance
  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const rateRef = useRef<number>(rate);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Keep refs updated
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    voiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      const all = window.speechSynthesis.getVoices();
      setVoices(all);

      const vi = getVietnameseVoices(all);
      setVietnameseVoices(vi);

      // Automatically select best Vietnamese voice if none selected yet
      if (!selectedVoice && all.length > 0) {
        const preferred = vi[0] || all.find((v) => v.default) || all[0];
        setSelectedVoice(preferred || null);
        voiceRef.current = preferred || null;
      }
    };

    updateVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, selectedVoice]);

  // Cleanup on unmount: stop any active speech
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  // Core utterance speaker
  const speakSentenceAtIndex = useCallback((index: number) => {
    if (!isSupported) return;

    const list = sentencesRef.current;
    if (index < 0 || index >= list.length) {
      setStatus('ended');
      return;
    }

    isCancelledRef.current = false;
    isPausedRef.current = false;
    currentIndexRef.current = index;
    setCurrentSentenceIndex(index);
    setStatus('playing');

    window.speechSynthesis.cancel();

    const textToSpeak = list[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rateRef.current;
    utterance.pitch = 1.0;
    utterance.lang = 'vi-VN';

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onend = () => {
      if (isCancelledRef.current || isPausedRef.current) return;

      const nextIndex = index + 1;
      if (nextIndex < sentencesRef.current.length) {
        speakSentenceAtIndex(nextIndex);
      } else {
        setStatus('ended');
      }
    };

    utterance.onerror = (event) => {
      // Ignore errors caused by manual cancels
      if (event.error === 'canceled' || event.error === 'interrupted') {
        return;
      }
      console.warn('Speech synthesis utterance error:', event.error);
      const nextIndex = index + 1;
      if (nextIndex < sentencesRef.current.length) {
        speakSentenceAtIndex(nextIndex);
      } else {
        setStatus('idle');
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const play = useCallback((sentencesList: string[], startIndex = 0) => {
    if (!isSupported || sentencesList.length === 0) return;

    sentencesRef.current = sentencesList;
    setSentences(sentencesList);
    speakSentenceAtIndex(startIndex);
  }, [isSupported, speakSentenceAtIndex]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    isPausedRef.current = true;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    isPausedRef.current = false;

    // Some browsers have issues with resume(), re-speaking current index is more reliable
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('playing');
    } else {
      speakSentenceAtIndex(currentIndexRef.current);
    }
  }, [isSupported, speakSentenceAtIndex]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isCancelledRef.current = true;
    isPausedRef.current = false;
    window.speechSynthesis.cancel();
    setStatus('idle');
  }, [isSupported]);

  const skipNext = useCallback(() => {
    const next = currentIndexRef.current + 1;
    if (next < sentencesRef.current.length) {
      speakSentenceAtIndex(next);
    }
  }, [speakSentenceAtIndex]);

  const skipPrevious = useCallback(() => {
    const prev = Math.max(0, currentIndexRef.current - 1);
    speakSentenceAtIndex(prev);
  }, [speakSentenceAtIndex]);

  const jumpToSentence = useCallback((index: number) => {
    if (index >= 0 && index < sentencesRef.current.length) {
      speakSentenceAtIndex(index);
    }
  }, [speakSentenceAtIndex]);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
    rateRef.current = newRate;
    // If currently playing, restart current sentence with the new rate
    if (status === 'playing') {
      speakSentenceAtIndex(currentIndexRef.current);
    }
  }, [status, speakSentenceAtIndex]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    voiceRef.current = voice;
    if (status === 'playing') {
      speakSentenceAtIndex(currentIndexRef.current);
    }
  }, [status, speakSentenceAtIndex]);

  return {
    isSupported,
    status,
    currentSentenceIndex,
    sentences,
    voices,
    vietnameseVoices,
    selectedVoice,
    rate,
    pitch,
    play,
    pause,
    resume,
    stop,
    skipNext,
    skipPrevious,
    jumpToSentence,
    setRate,
    setVoice,
  };
}
