import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type SignalType = "offer" | "answer" | "candidate" | "reject" | "end";

interface IncomingCall {
  id: string;
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
  isVideo: boolean;
}

interface CallState {
  isCallActive: boolean;
  isCallIncoming: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isVideoCall: boolean;
  callDuration: number;
  remoteUserId: string | null;
  incomingCall: IncomingCall | null;
  status: "idle" | "ringing" | "calling" | "connecting" | "active";
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export const useWebRTCCall = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isCallIncoming: false,
    isMuted: false,
    isVideoEnabled: false,
    isVideoCall: false,
    callDuration: 0,
    remoteUserId: null,
    incomingCall: null,
    status: "idle",
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const startTimer = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const resetState = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopLocalMedia();
    activeCallIdRef.current = null;
    remoteUserIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    setCallState({
      isCallActive: false,
      isCallIncoming: false,
      isMuted: false,
      isVideoEnabled: false,
      isVideoCall: false,
      callDuration: 0,
      remoteUserId: null,
      incomingCall: null,
      status: "idle",
    });
  }, [stopLocalMedia]);

  const sendSignal = useCallback(async ({
    toUserId,
    signalType,
    signalData,
    isVideo = false,
    callId,
  }: {
    toUserId: string;
    signalType: SignalType;
    signalData?: unknown;
    isVideo?: boolean;
    callId?: string | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const payload = {
      from_user_id: user.id,
      to_user_id: toUserId,
      signal_type: signalType,
      signal_data: signalData ?? {},
      is_video: isVideo,
      call_id: callId ?? null,
    };

    const { data, error } = await (supabase.from("call_signals" as any) as any)
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;
    return data?.id as string | undefined;
  }, []);

  const initializeWebRTC = useCallback(async (isVideo: boolean, remoteUserId: string) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = peerConnection;
    remoteUserIdRef.current = remoteUserId;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => remoteStream.addTrack(track));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate || !remoteUserIdRef.current) return;
      const candidate = event.candidate.toJSON();

      if (!activeCallIdRef.current) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await sendSignal({
          toUserId: remoteUserIdRef.current,
          signalType: "candidate",
          signalData: candidate,
          isVideo,
          callId: activeCallIdRef.current,
        });
      } catch (error) {
        console.error("Error enviando candidato ICE:", error);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        setCallState(prev => ({ ...prev, isCallActive: true, status: "active" }));
        startTimer();
      }
      if (["failed", "disconnected", "closed"].includes(peerConnection.connectionState)) {
        resetState();
      }
    };

    return peerConnection;
  }, [resetState, sendSignal, startTimer]);

  const startCall = useCallback(async (remoteUserId: string, isVideo = false) => {
    try {
      const peerConnection = await initializeWebRTC(isVideo, remoteUserId);
      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
      await peerConnection.setLocalDescription(offer);

      const callId = await sendSignal({
        toUserId: remoteUserId,
        signalType: "offer",
        signalData: offer,
        isVideo,
      });

      activeCallIdRef.current = callId ?? null;

      if (callId && pendingIceCandidatesRef.current.length > 0) {
        const candidates = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = [];
        await Promise.all(candidates.map(candidate => sendSignal({
          toUserId: remoteUserId,
          signalType: "candidate",
          signalData: candidate,
          isVideo,
          callId,
        })));
      }

      setCallState(prev => ({
        ...prev,
        isCallActive: true,
        isVideoCall: isVideo,
        isVideoEnabled: isVideo,
        remoteUserId,
        status: "calling",
      }));

      toast({ title: "Llamada enviada", description: "Esperando respuesta del usuario." });
    } catch (error) {
      console.error("Error starting call:", error);
      resetState();
      toast({ title: "Error", description: "No se pudo iniciar la llamada.", variant: "destructive" });
    }
  }, [initializeWebRTC, resetState, sendSignal, toast]);

  const acceptCall = useCallback(async () => {
    const incoming = callState.incomingCall;
    if (!incoming) return;

    try {
      activeCallIdRef.current = incoming.id;
      const peerConnection = await initializeWebRTC(incoming.isVideo, incoming.fromUserId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incoming.offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await sendSignal({
        toUserId: incoming.fromUserId,
        signalType: "answer",
        signalData: answer,
        isVideo: incoming.isVideo,
        callId: incoming.id,
      });

      setCallState(prev => ({
        ...prev,
        isCallIncoming: false,
        isCallActive: true,
        isVideoCall: incoming.isVideo,
        isVideoEnabled: incoming.isVideo,
        remoteUserId: incoming.fromUserId,
        incomingCall: null,
        status: "connecting",
      }));
    } catch (error) {
      console.error("Error accepting call:", error);
      resetState();
      toast({ title: "Error", description: "No se pudo aceptar la llamada.", variant: "destructive" });
    }
  }, [callState.incomingCall, initializeWebRTC, resetState, sendSignal, toast]);

  const rejectCall = useCallback(async () => {
    const incoming = callState.incomingCall;
    try {
      if (incoming) {
        await sendSignal({
          toUserId: incoming.fromUserId,
          signalType: "reject",
          signalData: { reason: "rejected" },
          isVideo: incoming.isVideo,
          callId: incoming.id,
        });
      }
    } catch (error) {
      console.error("Error rejecting call:", error);
    } finally {
      setCallState(prev => ({ ...prev, isCallIncoming: false, incomingCall: null, status: "idle" }));
      toast({ title: "Llamada rechazada" });
    }
  }, [callState.incomingCall, sendSignal, toast]);

  const endCall = useCallback(async () => {
    const remoteUserId = remoteUserIdRef.current;
    const callId = activeCallIdRef.current;
    try {
      if (remoteUserId && callId) {
        await sendSignal({
          toUserId: remoteUserId,
          signalType: "end",
          signalData: { ended_at: new Date().toISOString() },
          callId,
        });
      }
    } catch (error) {
      console.error("Error ending remote call:", error);
    } finally {
      resetState();
      toast({ title: "Llamada finalizada" });
    }
  }, [resetState, sendSignal, toast]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`call-signals:${currentUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `to_user_id=eq.${currentUserId}`,
      }, async (payload) => {
        const signal = payload.new as any;
        const signalType = signal.signal_type as SignalType;

        if (signalType === "offer") {
          setCallState(prev => ({
            ...prev,
            isCallIncoming: true,
            isVideoCall: !!signal.is_video,
            isVideoEnabled: !!signal.is_video,
            remoteUserId: signal.from_user_id,
            incomingCall: {
              id: signal.id,
              fromUserId: signal.from_user_id,
              offer: signal.signal_data as RTCSessionDescriptionInit,
              isVideo: !!signal.is_video,
            },
            status: "ringing",
          }));
          toast({ title: signal.is_video ? "Videollamada entrante" : "Llamada entrante", description: "Puedes aceptar o rechazar la llamada." });
          return;
        }

        if (signal.call_id && activeCallIdRef.current && signal.call_id !== activeCallIdRef.current) return;

        if (signalType === "answer" && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit));
          setCallState(prev => ({ ...prev, status: "connecting" }));
          return;
        }

        if (signalType === "candidate" && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          } catch (error) {
            console.error("Error añadiendo candidato ICE:", error);
          }
          return;
        }

        if (signalType === "reject") {
          toast({ title: "Llamada rechazada", description: "El usuario no aceptó la llamada." });
          resetState();
          return;
        }

        if (signalType === "end") {
          toast({ title: "Llamada finalizada" });
          resetState();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, resetState, toast]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
    setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  }, []);

  const formatCallDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
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
    localVideoRef,
    remoteVideoRef,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
  };
};
