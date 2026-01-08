import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";

interface ShareAsImageProps {
  isOpen: boolean;
  onClose: () => void;
  story: {
    title: string | null;
    content: string;
    author: {
      display_name: string;
      username: string;
    };
  };
}

const THEMES = [
  { id: "dark", bg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", text: "text-white", accent: "text-primary" },
  { id: "light", bg: "bg-gradient-to-br from-amber-50 via-white to-orange-50", text: "text-slate-800", accent: "text-primary" },
  { id: "purple", bg: "bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-900", text: "text-white", accent: "text-violet-300" },
  { id: "ocean", bg: "bg-gradient-to-br from-cyan-900 via-blue-800 to-indigo-900", text: "text-white", accent: "text-cyan-300" },
  { id: "sunset", bg: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600", text: "text-white", accent: "text-amber-200" },
];

const ShareAsImage = ({ isOpen, onClose, story }: ShareAsImageProps) => {
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
    link.download = `microrrelato-${Date.now()}.png`;
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

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "microrrelato.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: story.title || "Microrrelato",
          text: `Microrrelato de @${story.author.username}`,
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
              <h2 className="font-display font-semibold">Compartir como imagen</h2>
              <div className="w-10" />
            </div>

            {/* Preview Card */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div
                ref={cardRef}
                className={`w-full max-w-md aspect-[4/5] rounded-3xl p-6 flex flex-col ${selectedTheme.bg}`}
              >
                {/* Quote mark */}
                <div className={`text-6xl font-serif ${selectedTheme.accent} opacity-50 leading-none`}>
                  "
                </div>
                
                {/* Content */}
                <div className="flex-1 flex flex-col justify-center -mt-4">
                  {story.title && (
                    <h3 className={`font-display font-bold text-xl mb-4 ${selectedTheme.text}`}>
                      {story.title}
                    </h3>
                  )}
                  <p className={`text-lg leading-relaxed whitespace-pre-wrap ${selectedTheme.text}`}>
                    {story.content}
                  </p>
                </div>

                {/* Author */}
                <div className={`mt-4 pt-4 border-t border-white/20 flex items-center justify-between ${selectedTheme.text}`}>
                  <div>
                    <p className="font-medium">{story.author.display_name || "Anónimo"}</p>
                    <p className="text-sm opacity-70">@{story.author.username}</p>
                  </div>
                  <div className={`text-xs opacity-50 ${selectedTheme.accent}`}>
                    ✦ microrrelato
                  </div>
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

export default ShareAsImage;
