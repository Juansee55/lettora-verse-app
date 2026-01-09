import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Palette, Users, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";

interface ShareProfileAsImageProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  stats: {
    followers: number;
    totalLikes: number;
    totalReads: number;
  };
}

const THEMES = [
  { id: "dark", bg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", text: "text-white", accent: "text-violet-400" },
  { id: "purple", bg: "bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-900", text: "text-white", accent: "text-violet-300" },
  { id: "ocean", bg: "bg-gradient-to-br from-cyan-900 via-blue-800 to-indigo-900", text: "text-white", accent: "text-cyan-300" },
  { id: "sunset", bg: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600", text: "text-white", accent: "text-amber-200" },
  { id: "light", bg: "bg-gradient-to-br from-amber-50 via-white to-violet-50", text: "text-slate-800", accent: "text-violet-600" },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const ShareProfileAsImage = ({ isOpen, onClose, profile, stats }: ShareProfileAsImageProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setIsGenerating(true);
    
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });
      return dataUrl;
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "No se pudo generar la imagen.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.download = `perfil-${profile.username || "user"}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    toast({
      title: "¡Descargado!",
      description: "La imagen se guardó correctamente.",
    });
  };

  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "perfil.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Perfil de ${profile.display_name || profile.username}`,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          handleCopyToClipboard(blob);
        }
      }
    } else {
      handleCopyToClipboard(blob);
    }
  };

  const handleCopyToClipboard = async (blob: Blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast({
        title: "¡Copiado!",
        description: "La imagen se copió al portapapeles.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la imagen.",
        variant: "destructive",
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto"
        >
          <div className="container mx-auto px-4 py-4 max-w-lg min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="font-display font-semibold">Compartir perfil</h2>
              <div className="w-10" />
            </div>

            {/* Preview Card */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div
                ref={cardRef}
                className={`w-full max-w-md aspect-square rounded-3xl p-6 flex flex-col items-center justify-center ${selectedTheme.bg}`}
              >
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold overflow-hidden mb-4">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className={selectedTheme.text}>
                      {(profile.display_name || profile.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className={`font-display font-bold text-2xl ${selectedTheme.text} mb-1`}>
                  {profile.display_name || "Usuario"}
                </h3>
                <p className={`text-sm opacity-70 ${selectedTheme.text} mb-4`}>
                  @{profile.username || "user"}
                </p>

                {/* Bio */}
                {profile.bio && (
                  <p className={`text-center text-sm ${selectedTheme.text} opacity-80 mb-6 line-clamp-2 max-w-[80%]`}>
                    {profile.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-8">
                  <div className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${selectedTheme.accent}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <p className={`font-bold text-xl ${selectedTheme.text}`}>{formatNumber(stats.followers)}</p>
                    <p className={`text-xs opacity-60 ${selectedTheme.text}`}>Seguidores</p>
                  </div>
                  <div className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${selectedTheme.accent}`}>
                      <Heart className="w-4 h-4" />
                    </div>
                    <p className={`font-bold text-xl ${selectedTheme.text}`}>{formatNumber(stats.totalLikes)}</p>
                    <p className={`text-xs opacity-60 ${selectedTheme.text}`}>Likes</p>
                  </div>
                  <div className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${selectedTheme.accent}`}>
                      <Eye className="w-4 h-4" />
                    </div>
                    <p className={`font-bold text-xl ${selectedTheme.text}`}>{formatNumber(stats.totalReads)}</p>
                    <p className={`text-xs opacity-60 ${selectedTheme.text}`}>Lecturas</p>
                  </div>
                </div>

                {/* Branding */}
                <div className={`mt-6 text-xs opacity-40 ${selectedTheme.text}`}>
                  ✦ lettora
                </div>
              </div>

              {/* Theme selector */}
              <div className="flex items-center gap-2 mt-6">
                <Palette className="w-4 h-4 text-muted-foreground" />
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`w-8 h-8 rounded-full ${theme.bg} border-2 transition-all ${
                      selectedTheme.id === theme.id
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleShare}
                disabled={isGenerating}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartir
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareProfileAsImage;
