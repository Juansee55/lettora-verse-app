import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Palette, Eye, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";

interface ShareBookAsImageProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    title: string;
    cover_url: string | null;
    genre: string | null;
    author: {
      display_name: string | null;
      username: string | null;
    };
  };
  stats: {
    reads: number;
    likes: number;
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

const ShareBookAsImage = ({ isOpen, onClose, book, stats }: ShareBookAsImageProps) => {
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
    link.download = `libro-${book.title.replace(/\s+/g, "-")}-${Date.now()}.png`;
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
    const file = new File([blob], "libro.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: book.title,
          text: `${book.title} por ${book.author.display_name || book.author.username}`,
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
              <h2 className="font-display font-semibold">Compartir libro</h2>
              <div className="w-10" />
            </div>

            {/* Preview Card */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div
                ref={cardRef}
                className={`w-full max-w-md aspect-[4/5] rounded-3xl p-6 flex flex-col ${selectedTheme.bg}`}
              >
                {/* Book Cover */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-36 h-52 rounded-xl overflow-hidden shadow-2xl">
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Info */}
                <div className="text-center mt-4">
                  {book.genre && (
                    <span className={`text-xs px-2 py-1 rounded-full bg-white/20 ${selectedTheme.text} mb-2 inline-block`}>
                      {book.genre}
                    </span>
                  )}
                  <h3 className={`font-display font-bold text-xl ${selectedTheme.text} mb-1 line-clamp-2`}>
                    {book.title}
                  </h3>
                  <p className={`text-sm opacity-70 ${selectedTheme.text}`}>
                    por {book.author.display_name || book.author.username || "Anónimo"}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <Eye className={`w-5 h-5 ${selectedTheme.accent}`} />
                    <span className={`font-bold ${selectedTheme.text}`}>{formatNumber(stats.reads)}</span>
                    <span className={`text-xs opacity-60 ${selectedTheme.text}`}>lecturas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className={`w-5 h-5 ${selectedTheme.accent}`} />
                    <span className={`font-bold ${selectedTheme.text}`}>{formatNumber(stats.likes)}</span>
                    <span className={`text-xs opacity-60 ${selectedTheme.text}`}>likes</span>
                  </div>
                </div>

                {/* Branding */}
                <div className={`mt-4 text-center text-xs opacity-40 ${selectedTheme.text}`}>
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

export default ShareBookAsImage;
