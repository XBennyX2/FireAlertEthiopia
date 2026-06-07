import { useState, useRef, useCallback } from 'react';

// ── Language code map ─────────────────────────────────────────────
const LANG_CODES = {
  en: 'en-US',
  am: 'am-ET'
};

// ── Field extraction — English ────────────────────────────────────
function extractFieldsEnglish(transcript) {
  const text   = transcript.toLowerCase();
  const result = {};

  // Fire type detection
  if (text.includes('residential') || text.includes('house') || text.includes('apartment') || text.includes('home')) {
    result.fire_type = 'residential';
  } else if (text.includes('commercial') || text.includes('shop') || text.includes('store') || text.includes('office') || text.includes('restaurant')) {
    result.fire_type = 'commercial';
  } else if (text.includes('vehicle') || text.includes('car') || text.includes('truck') || text.includes('bus')) {
    result.fire_type = 'vehicle';
  } else if (text.includes('industrial') || text.includes('factory') || text.includes('warehouse')) {
    result.fire_type = 'industrial';
  } else if (text.includes('wildland') || text.includes('forest') || text.includes('field') || text.includes('grass')) {
    result.fire_type = 'wildland';
  } else {
    result.fire_type = 'other';
  }

  // Use the full transcript as the description
  result.description = transcript.trim();

  return result;
}

// ── Field extraction — Amharic ────────────────────────────────────
function extractFieldsAmharic(transcript) {
  const text   = transcript;
  const result = {};

  // Fire type detection in Amharic
  if (text.includes('መኖሪያ') || text.includes('ቤት') || text.includes('አፓርትመንት')) {
    result.fire_type = 'residential';
  } else if (text.includes('ንግድ') || text.includes('ሱቅ') || text.includes('ሆቴል') || text.includes('ሬስቶራንት')) {
    result.fire_type = 'commercial';
  } else if (text.includes('ተሽከርካሪ') || text.includes('መኪና') || text.includes('አውቶቡስ')) {
    result.fire_type = 'vehicle';
  } else if (text.includes('ፋብሪካ') || text.includes('ኢንዱስትሪ') || text.includes('መጋዘን')) {
    result.fire_type = 'industrial';
  } else if (text.includes('ደን') || text.includes('ሜዳ') || text.includes('ጫካ')) {
    result.fire_type = 'wildland';
  } else {
    result.fire_type = 'other';
  }

  result.description = transcript.trim();

  return result;
}

// ── Main hook ─────────────────────────────────────────────────────
export default function useVoiceRecognition({ language = 'en', onResult, onError }) {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [supported,   setSupported]   = useState(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!supported) {
      onError?.('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition           = new SpeechRecognition();
    recognition.lang            = LANG_CODES[language] || 'en-US';
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      const current = final || interim;
      setTranscript(current);

      if (final) {
        try {
          const fields = language === 'am'
            ? extractFieldsAmharic(final)
            : extractFieldsEnglish(final);

          onResult?.({ transcript: final, fields });
        } catch (err) {
          console.error('Field extraction error:', err);
          // Still pass the transcript even if extraction fails
          onResult?.({
            transcript: final,
            fields: { description: final, fire_type: 'other' }
          });
        }
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      const messages = {
        'not-allowed':  'Microphone access was denied. Please allow microphone access in your browser settings.',
        'no-speech':    'No speech was detected. Please try again.',
        'network':      'Network error during voice recognition.',
        'aborted':      'Voice recognition was stopped.',
      };
      onError?.(messages[event.error] || `Voice error: ${event.error}`);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();

  }, [language, onResult, onError, supported]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  return { listening, transcript, supported, start, stop };
}