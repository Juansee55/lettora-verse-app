import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
  MessageCircle,
  Share2,
  BookmarkPlus,
  Download,
  Check,
  Wifi,
  WifiOff,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useReadingSettings } from "@/hooks/useReadingSettings";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { ReadingSettingsSheet } from "@/components/reader/ReadingSettingsSheet";
import { PageTransition } from "@/components/reader/PageTransition";
import PDFViewer from "@/components/reader/PDFViewer";
import InteractiveContent from "@/components/reader/InteractiveContent";

interface ChapterData {
  id: string;
  title: string;
  content: string | null;
  chapter_number: number;
  word_count: number | null;
  likes_count: number | null;
  book_id: string;
  books: {
    id: string;
    title: string;
    author_id: string;
  } | null;
}

const ChapterReaderPage = () => {
  const { bookId, chapterNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { settings, updateSetting, resetSettings, getThemeStyles, getFontFamily, getMarginClass } = useReadingSettings();
  const { isOnline, getOfflineBook, isBookDownloaded, saveBookOffline } = useOfflineStorage();
  
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [downloading, setDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [savedChapter, setSavedChapter] = useState(false);
  const [readingStartTime] = useState(Date.now());
  
  // Swipe gesture
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const themeStyles = getThemeStyles();
  const currentNum = parseInt(chapterNumber || "1");

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep screen on
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      if (settings.keepScreenOn && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock not supported');
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [settings.keepScreenOn]);

  // Fetch chapter data
  useEffect(() => {
    const fetchChapter = async () => {
      if (!bookId || !chapterNumber) return;

      // Try offline first if not online
      if (!isOnline) {
        const offlineBook = await getOfflineBook(bookId);
        if (offlineBook) {
          const offlineChapter = offlineBook.chapters.find(
            c => c.chapterNumber === parseInt(chapterNumber)
          );
          if (offlineChapter) {
            setChapter({
              id: offlineChapter.id,
              title: offlineChapter.title,
              content: offlineChapter.content,
              chapter_number: offlineChapter.chapterNumber,
              word_count: offlineChapter.wordCount,
              likes_count: 0,
              book_id: bookId,
              books: {
                id: bookId,
                title: offlineBook.title,
                author_id: '',
              },
            });
            setTotalChapters(offlineBook.chapters.length);
            setLoading(false);
            return;
          }
        }
        toast({
          title: "Sin conexión",
          description: "Este libro no está disponible offline.",
          variant: "destructive",
        });
        return;
      }

      const { data: chapterData, error } = await supabase
        .from("chapters")
        .select(`
          id,
          title,
          content,
          chapter_number,
          word_count,
          likes_count,
          book_id,
          books:book_id (
            id,
            title,
            author_id
          )
        `)
        .eq("book_id", bookId)
        .eq("chapter_number", parseInt(chapterNumber))
        .eq("is_published", true)
        .single();

      if (error || !chapterData) {
        navigate(`/book/${bookId}`);
        return;
      }

      setChapter(chapterData as unknown as ChapterData);
      setLikesCount(chapterData.likes_count || 0);
      setIsDownloaded(isBookDownloaded(bookId));

      // Get total chapters
      const { count } = await supabase
        .from("chapters")
        .select("*", { count: "exact", head: true })
        .eq("book_id", bookId)
        .eq("is_published", true);

      setTotalChapters(count || 0);

      // Check if liked and update progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likeData } = await supabase
          .from("chapter_likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterData.id)
          .maybeSingle();

        setLiked(!!likeData);

        // Check if chapter is saved
        const { data: savedData } = await supabase
          .from("saved_chapters")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterData.id)
          .maybeSingle();
        setSavedChapter(!!savedData);

        // Update reading progress
        const { data: existingProgress } = await supabase
          .from("reading_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .maybeSingle();

        const progressData = {
          current_chapter: parseInt(chapterNumber),
          progress_percent: Math.round((parseInt(chapterNumber) / (count || 1)) * 100),
        };

        if (existingProgress) {
          await supabase
            .from("reading_progress")
            .update(progressData)
            .eq("id", existingProgress.id);
        } else {
          await supabase.from("reading_progress").insert({
            user_id: user.id,
            book_id: bookId,
            ...progressData,
          });
        }
      }

      setLoading(false);
    };

    setLoading(true);
    fetchChapter();
  }, [bookId, chapterNumber, navigate, isOnline, getOfflineBook, isBookDownloaded, toast]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!chapter) return;

    if (liked) {
      await supabase
        .from("chapter_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("chapter_id", chapter.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("chapter_likes").insert({
        user_id: user.id,
        chapter_id: chapter.id,
      });
      setLiked(true);
      setLikesCount((c) => c + 1);

      // Create notification for author
      if (chapter.books?.author_id && chapter.books.author_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: chapter.books.author_id,
          type: "chapter_like",
          title: "Nuevo like en tu capítulo",
          message: `A alguien le gustó "${chapter.title}"`,
          link: `/book/${bookId}/chapter/${chapterNumber}`,
        });
      }
    }
  };

  const goToChapter = useCallback((num: number, dir: 'next' | 'prev') => {
    if (num >= 1 && num <= totalChapters) {
      setDirection(dir);
      window.scrollTo(0, 0);
      navigate(`/book/${bookId}/chapter/${num}`);
    }
  }, [bookId, navigate, totalChapters]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold && currentNum > 1) {
      goToChapter(currentNum - 1, 'prev');
    } else if (info.offset.x < -threshold && currentNum < totalChapters) {
      goToChapter(currentNum + 1, 'next');
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (!settings.tapNavigation) {
      setShowControls(!showControls);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.25) {
      // Left tap - previous
      if (currentNum > 1) goToChapter(currentNum - 1, 'prev');
    } else if (x > width * 0.75) {
      // Right tap - next
      if (currentNum < totalChapters) goToChapter(currentNum + 1, 'next');
    } else {
      // Center tap - toggle controls
      setShowControls(!showControls);
    }
  };

  const downloadBook = async () => {
    if (!bookId || !chapter?.books) return;
    
    setDownloading(true);
    try {
      // Fetch all chapters
      const { data: chapters } = await supabase
        .from("chapters")
        .select("id, title, content, chapter_number, word_count")
        .eq("book_id", bookId)
        .eq("is_published", true)
        .order("chapter_number");

      if (!chapters) throw new Error("No chapters found");

      // Fetch book details
      const { data: book } = await supabase
        .from("books")
        .select("title, cover_url, profiles:author_id(display_name)")
        .eq("id", bookId)
        .single();

      if (!book) throw new Error("Book not found");

      await saveBookOffline({
        id: bookId,
        title: book.title,
        author: (book.profiles as any)?.display_name || 'Autor desconocido',
        coverUrl: book.cover_url,
        downloadedAt: new Date().toISOString(),
        chapters: chapters.map(c => ({
          id: c.id,
          bookId,
          title: c.title,
          content: c.content || '',
          chapterNumber: c.chapter_number,
          wordCount: c.word_count || 0,
        })),
      });

      setIsDownloaded(true);
      toast({
        title: "Libro descargado",
        description: "Ahora puedes leerlo sin conexión.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el libro.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${themeStyles.bg} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando capítulo...</p>
        </motion.div>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text}`}>
      {/* Progress bar - iOS style */}
      {settings.showProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showControls ? 1 : 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-muted"
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${scrollProgress}%` }}
            transition={{ ease: "linear" }}
          />
        </motion.div>
      )}

      {/* iOS Header */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={`fixed top-0 left-0 right-0 z-40 ${themeStyles.bg}/70 backdrop-blur-2xl border-b border-border/30`}
          >
            <div className="flex items-center justify-between px-4 h-[52px]">
              <button
                onClick={() => navigate(`/book/${bookId}`)}
                className="flex items-center gap-1 text-primary font-normal text-[17px] active:opacity-60 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Libro</span>
              </button>
              
              <div className="flex-1 text-center px-4 min-w-0">
                <p className="text-[13px] text-muted-foreground truncate flex items-center justify-center gap-1">
                  {isOnline ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  Capítulo {currentNum} de {totalChapters}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user || !chapter) return;
                    if (savedChapter) {
                      await supabase.from("saved_chapters").delete().eq("user_id", user.id).eq("chapter_id", chapter.id);
                      setSavedChapter(false);
                    } else {
                      await supabase.from("saved_chapters").insert({ user_id: user.id, chapter_id: chapter.id, book_id: bookId! });
                      setSavedChapter(true);
                    }
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors"
                >
                  <Bookmark className={`w-5 h-5 ${savedChapter ? "fill-primary text-primary" : "text-primary"}`} />
                </button>
                <button
                  onClick={downloadBook}
                  disabled={downloading || isDownloaded}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : isDownloaded ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Download className="w-5 h-5 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors"
                >
                  <Settings className="w-5 h-5 text-primary" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.main
        ref={contentRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        className={`container mx-auto py-20 ${getMarginClass()}`}
        onClick={handleTap}
      >
        <PageTransition
          pageKey={`chapter-${chapterNumber}`}
          animation={settings.pageAnimation}
          direction={direction}
        >
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-2">
              {chapter.title}
            </h2>
            <p className="text-[15px] text-muted-foreground mb-8">
              Capítulo {currentNum} • {chapter.word_count || 0} palabras
            </p>
            
            {/* PDF detection */}
            {chapter.content?.match(/^\[PDF:\s*(https?:\/\/[^\]]+)\]/) ? (
              <PDFViewer
                url={chapter.content.match(/^\[PDF:\s*(https?:\/\/[^\]]+)\]/)![1]}
              />
            ) : (
              <InteractiveContent
                content={chapter.content || ""}
                chapterId={chapter.id}
                fontSize={settings.fontSize}
                lineHeight={settings.lineHeight}
                fontFamily={getFontFamily()}
                textAlign={settings.textAlign}
              />
            )}
          </motion.article>
        </PageTransition>

        {/* Chapter end actions - iOS style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-12 py-6 border-t border-border/50`}
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition-all ${
                liked 
                  ? "bg-rose-500 text-white" 
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-muted text-foreground font-semibold hover:bg-muted/80 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Comentar
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <BookmarkPlus className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Next chapter */}
          {currentNum < totalChapters && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-[15px] text-muted-foreground mb-3">
                Continúa leyendo
              </p>
              <button
                onClick={() => goToChapter(currentNum + 1, 'next')}
                className="h-[50px] px-8 bg-primary text-primary-foreground font-semibold rounded-full active:scale-95 transition-transform"
              >
                Siguiente capítulo
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.main>

      {/* iOS Bottom navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.footer
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={`fixed bottom-0 left-0 right-0 z-40 ${themeStyles.bg}/70 backdrop-blur-2xl border-t border-border/30 pb-safe`}
          >
            <div className="flex items-center justify-between px-4 h-[52px]">
              <button
                disabled={currentNum <= 1}
                onClick={() => goToChapter(currentNum - 1, 'prev')}
                className="flex items-center gap-1 text-primary font-normal text-[17px] disabled:opacity-40 active:opacity-60 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>

              <div className="flex items-center gap-3">
                <span className="text-[15px] font-semibold">{currentNum}</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentNum / totalChapters) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>
                <span className="text-[15px] text-muted-foreground">{totalChapters}</span>
              </div>

              <button
                disabled={currentNum >= totalChapters}
                onClick={() => goToChapter(currentNum + 1, 'next')}
                className="flex items-center gap-1 text-primary font-normal text-[17px] disabled:opacity-40 active:opacity-60 transition-opacity"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Settings Sheet */}
      <ReadingSettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onUpdateSetting={updateSetting}
        onReset={resetSettings}
      />
    </div>
  );
};

export default ChapterReaderPage;
