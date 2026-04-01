import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, ZoomIn, ZoomOut, ChevronUp, BookOpen, Columns2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  mode?: "image" | "text";
}

interface PDFPage {
  index: number;
  text: string;
  imageUrl?: string;
}

const PDFViewer = ({ url, mode: initialMode = "text" }: PDFViewerProps) => {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"image" | "text">(initialMode);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAllPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      const renderedPages: PDFPage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Extract text
        const textContent = await page.getTextContent();
        const textItems = textContent.items
          .filter((item: any) => item.str)
          .map((item: any) => item.str);
        const pageText = textItems.join(" ").replace(/\s+/g, " ").trim();

        // Render image fallback
        let imageUrl: string | undefined;
        if (mode === "image") {
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          imageUrl = canvas.toDataURL("image/jpeg", 0.92);
        }

        renderedPages.push({ index: i, text: pageText, imageUrl });
        setLoadedPages(i);
      }

      setPages(renderedPages);
    } catch (err) {
      console.error("PDF render error:", err);
      setError("No se pudo cargar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [url, scale, mode]);

  useEffect(() => {
    renderAllPages();
  }, [renderAllPages]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-[15px] mb-4">{error}</p>
        <button onClick={renderAllPages} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[14px] font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Controls */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-xl border-b border-border/30 rounded-xl mb-4">
        <span className="text-[13px] text-muted-foreground font-medium">
          {loading ? `Cargando ${loadedPages}/${totalPages || "..."} páginas` : `${totalPages} páginas`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "text" ? "image" : "text")}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary active:bg-muted transition-colors"
            title={mode === "text" ? "Ver como imagen" : "Ver como texto"}
          >
            {mode === "text" ? <Columns2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          </button>
          {mode === "image" && (
            <>
              <button onClick={() => setScale(s => Math.max(0.8, s - 0.2))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary active:bg-muted transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-medium w-10 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary active:bg-muted transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-[14px] text-muted-foreground">
            Renderizando página {loadedPages} de {totalPages || "..."}
          </p>
          {totalPages > 0 && (
            <div className="w-48 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(loadedPages / totalPages) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Text Mode */}
      {mode === "text" && !loading && (
        <div className="prose max-w-none">
          {pages.map((page) => (
            <div key={page.index} className="mb-6">
              {page.text ? (
                <p className="text-[16px] leading-[1.8] whitespace-pre-wrap">{page.text}</p>
              ) : (
                <p className="text-muted-foreground italic text-[14px]">[Página {page.index} — sin texto extraíble]</p>
              )}
              {page.index < totalPages && <hr className="border-border/20 my-4" />}
            </div>
          ))}
        </div>
      )}

      {/* Image Mode */}
      {mode === "image" && !loading && (
        <div className="space-y-2">
          {pages.map((page) => (
            <motion.div key={page.index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: page.index * 0.02 }} className="relative">
              {page.imageUrl && (
                <img src={page.imageUrl} alt={`Página ${page.index}`} className="w-full rounded-lg shadow-sm border border-border/20" loading="lazy" />
              )}
              <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {page.index}/{totalPages}
              </span>
            </motion.div>
          ))}
        </div>
      )}

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
