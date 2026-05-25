import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallState {
  isCallActive: boolean;
  isCallIncoming: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  remoteUserId: string | null;
}

export const useWebRTCCall = () => {
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isCallIncoming: false,
    isMuted: false,
    isVideoEnabled: false,
    callDuration: 0,
    remoteUserId: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Inicializar WebRTC
  const initializeWebRTC = useCallback(async (isVideo: boolean = false) => {
    try {
      const config = {
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        ],
      };

      const peerConnection = new RTCPeerConnection(config);
      peerConnectionRef.current = peerConnection;

      // Obtener stream local
      const constraints = {
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Agregar tracks al peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Manejar eventos de conexión
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          toast({
            title: "Conectado",
            description: "Llamada establecida correctamente.",
          });
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          endCall();
        }
      };

      setCallState(prev => ({
        ...prev,
        isCallActive: true,
        isVideoEnabled: isVideo,
      }));

      // Iniciar temporizador de duración
      callTimerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
      }, 1000);

      return peerConnection;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono o cámara.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Iniciar llamada
  const startCall = useCallback(async (remoteUserId: string, isVideo: boolean = false) => {
    try {
      const peerConnection = await initializeWebRTC(isVideo);

      // Crear oferta
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });

      await peerConnection.setLocalDescription(offer);

      // Enviar oferta a través de Supabase
      await supabase.from('call_signals').insert({
        from_user_id: (await supabase.auth.getUser()).data.user?.id,
        to_user_id: remoteUserId,
        signal_type: 'offer',
        signal_data: offer,
        is_video: isVideo,
      });

      setCallState(prev => ({ ...prev, remoteUserId }));

      toast({
        title: "Llamada iniciada",
        description: "Esperando respuesta...",
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la llamada.",
        variant: "destructive",
      });
    }
  }, [initializeWebRTC, toast]);

  // Aceptar llamada
  const acceptCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = await initializeWebRTC(offer.type === 'offer');

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Enviar respuesta
      await supabase.from('call_signals').insert({
        from_user_id: (await supabase.auth.getUser()).data.user?.id,
        signal_type: 'answer',
        signal_data: answer,
      });

      setCallState(prev => ({ ...prev, isCallIncoming: false }));

      toast({
        title: "Llamada aceptada",
        description: "Conectando...",
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: "Error",
        description: "No se pudo aceptar la llamada.",
        variant: "destructive",
      });
    }
  }, [initializeWebRTC, toast]);

  // Rechazar llamada
  const rejectCall = useCallback(async () => {
    setCallState(prev => ({ ...prev, isCallIncoming: false }));
    toast({
      title: "Llamada rechazada",
    });
  }, [toast]);

  // Terminar llamada
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    setCallState({
      isCallActive: false,
      isCallIncoming: false,
      isMuted: false,
      isVideoEnabled: false,
      callDuration: 0,
      remoteUserId: null,
    });

    toast({
      title: "Llamada finalizada",
    });
  }, [toast]);

  // Alternar micrófono
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  // Alternar video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, []);

  // Formatear duración
  const formatCallDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    formatCallDuration,
    localStream: localStreamRef.current,
  };
};
