import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallInterfaceProps {
  isActive: boolean;
  isVideo: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  duration: string;
  remoteUserName: string;
  remoteUserAvatar?: string | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement>;
}

const CallInterface = ({
  isActive,
  isVideo,
  isMuted,
  isVideoEnabled,
  duration,
  remoteUserName,
  remoteUserAvatar,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  localVideoRef,
  remoteVideoRef,
}: CallInterfaceProps) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
        >
          {/* Video remoto */}
          {isVideo && remoteVideoRef && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Contenido de la llamada */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
            {/* Info de la llamada */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-auto pt-12"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden border-2 border-white/20">
                {remoteUserAvatar ? (
                  <img
                    src={remoteUserAvatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {remoteUserName[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {remoteUserName}
              </h2>

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-lg text-white/70 font-semibold"
              >
                {duration}
              </motion.p>
            </motion.div>

            {/* Video local (esquina) */}
            {isVideo && localVideoRef && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-24 right-4 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/30 bg-black/50 backdrop-blur-sm"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </motion.div>
            )}

            {/* Controles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 flex items-center gap-4"
            >
              {/* Mute button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? "bg-red-500/30 border-2 border-red-500"
                    : "bg-white/20 border-2 border-white/30 hover:bg-white/30"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </motion.button>

              {/* End call button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEndCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/50"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>

              {/* Video button */}
              {isVideo && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isVideoEnabled
                      ? "bg-white/20 border-2 border-white/30 hover:bg-white/30"
                      : "bg-red-500/30 border-2 border-red-500"
                  }`}
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallInterface;
