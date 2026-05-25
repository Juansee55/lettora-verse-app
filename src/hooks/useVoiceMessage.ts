import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageState {
  isRecording: boolean;
  isPreparing: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export const useVoiceMessage = () => {
  const [state, setState] = useState<VoiceMessageState>({
    isRecording: false,
    isPreparing: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isPreparing: true }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          audioBlob,
          audioUrl,
          isPreparing: false,
        }));

        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Iniciar contador de duración
      let duration = 0;
      durationIntervalRef.current = setInterval(() => {
        duration += 1;
        setState(prev => ({ ...prev, duration }));

        // Límite máximo de 5 minutos
        if (duration >= 300) {
          stopRecording();
        }
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPreparing: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
      }));

      toast({
        title: "Grabando",
        description: "Micrófono activado. Máximo 5 minutos.",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setState(prev => ({ ...prev, isPreparing: false }));
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono. Verifica los permisos.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, [state.isRecording]);

  const cancelRecording = useCallback(() => {
    stopRecording();
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Limpiar referencias
    audioChunksRef.current = [];
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPreparing: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
  }, [stopRecording, state.audioUrl]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
};
