import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, ZoomIn, ZoomOut, ChevronUp } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
}

const PDFViewer = ({ url }: PDFViewerProps) => {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAllPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      const renderedPages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        renderedPages.push(canvas.toDataURL("image/jpeg", 0.92));
        setLoadedPages(i);
      }

      setPages(renderedPages);
    } catch (err) {
      console.error("PDF render error:", err);
      setError("No se pudo cargar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [url, scale]);

  useEffect(() => {
    renderAllPages();
  }, [renderAllPages]);

  const adjustScale = (delta: number) => {
    setScale((prev) => Math.max(0.8, Math.min(3, prev + delta)));
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-[15px] mb-4">{error}</p>
        <button
          onClick={renderAllPages}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[14px] font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Zoom controls */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-xl border-b border-border/30 rounded-xl mb-4">
        <span className="text-[13px] text-muted-foreground font-medium">
          {loading
            ? `Cargando ${loadedPages}/${totalPages || "..."} páginas`
            : `${totalPages} páginas`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustScale(-0.2)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary active:bg-muted transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => adjustScale(0.2)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary active:bg-muted transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-[14px] text-muted-foreground">
            Renderizando página {loadedPages} de {totalPages || "..."}
          </p>
          {totalPages > 0 && (
            <div className="w-48 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${(loadedPages / totalPages) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Rendered pages */}
      <div className="space-y-2">
        {pages.map((dataUrl, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className="relative"
          >
            <img
              src={dataUrl}
              alt={`Página ${index + 1}`}
              className="w-full rounded-lg shadow-sm border border-border/20"
              loading="lazy"
            />
            <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {index + 1}/{totalPages}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Scroll to top */}
      {pages.length > 3 && !loading && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-30 w-10 h-10 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
};

export default PDFViewer;
