import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Heart,
  MessageCircle,
  PenTool,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LettoraMark from "@/components/brand/LettoraMark";

const slides = [
  {
    icon: Sparkles,
    eyebrow: "Tu próxima historia empieza aquí",
    title: "Bienvenido a Lettora",
    description: "Un refugio para leer, escribir y encontrar personas que sienten las historias como tú.",
    gradient: "from-violet-600 via-primary to-fuchsia-500",
  },
  {
    icon: BookOpen,
    eyebrow: "Lee sin límites",
    title: "Descubre nuevas voces",
    description: "Explora libros, poemas y microrrelatos de una comunidad de autores independientes.",
    gradient: "from-indigo-600 to-violet-500",
  },
  {
    icon: PenTool,
    eyebrow: "Tu universo, tus reglas",
    title: "Escribe y publica",
    description: "Convierte tus ideas en capítulos, sagas y mundos que puedan quedarse en la memoria.",
    gradient: "from-violet-700 to-fuchsia-500",
  },
  {
    icon: Users,
    eyebrow: "Una comunidad que acompaña",
    title: "Conecta con escritores",
    description: "Sigue a tus autores favoritos, comparte recomendaciones y crece junto a otros creadores.",
    gradient: "from-fuchsia-600 to-violet-600",
  },
  {
    icon: MessageCircle,
    eyebrow: "Las historias también conversan",
    title: "Comenta y conversa",
    description: "Participa en conversaciones literarias y encuentra tu rincón dentro de Lettora.",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    icon: Heart,
    eyebrow: "Ya estás a un paso",
    title: "Hazlo tuyo",
    description: "Crea tu perfil, guarda tus lecturas y empieza a construir una biblioteca que te represente.",
    gradient: "from-primary to-fuchsia-500",
  },
];

interface OnboardingProps {
  onComplete?: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  const handleComplete = () => {
    onComplete?.();
    navigate("/auth");
  };

  const nextSlide = () => {
    if (isLast) handleComplete();
    else setCurrentSlide((previous) => previous + 1);
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 -top-36 h-[430px] w-[430px] rounded-full bg-primary/12 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-44 -left-40 h-[480px] w-[480px] rounded-full bg-fuchsia-500/10 blur-3xl"
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/8 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <LettoraMark size="sm" animated showWordmark />
          <Button variant="ghost" onClick={handleComplete} className="rounded-full px-3 text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary">
            Saltar
          </Button>
        </header>

        <main className="flex flex-1 flex-col justify-center pb-6 pt-3 sm:pt-0">
          <div className="mb-8 flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Lettora / {String(currentSlide + 1).padStart(2, "0")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Una comunidad hecha de historias</p>
            </div>
            <div className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
              {currentSlide + 1} / {slides.length}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={currentSlide}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <div className={`relative mb-9 flex h-44 w-44 items-center justify-center rounded-[46px] bg-gradient-to-br ${slide.gradient} shadow-[0_28px_55px_-22px_hsl(var(--primary)/0.7)] sm:h-52 sm:w-52`}>
                <div className="absolute inset-2 rounded-[40px] border border-white/20" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 rounded-[54px] border border-primary/15"
                />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] bg-white/14 shadow-inner backdrop-blur-sm sm:h-32 sm:w-32">
                  <Icon className="h-14 w-14 text-white sm:h-16 sm:w-16" strokeWidth={1.5} />
                </div>
                <motion.div
                  animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-1 top-7 h-3 w-3 rounded-full bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.45)]"
                />
              </div>

              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.19em] text-primary">{slide.eyebrow}</p>
              <h1 className="max-w-md font-display text-[36px] font-bold leading-[1.03] tracking-tight sm:text-[44px]">{slide.title}</h1>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">{slide.description}</p>
            </motion.section>
          </AnimatePresence>
        </main>

        <footer className="pb-6 pt-2 sm:pb-10">
          <div className="mb-6 flex items-center gap-1.5 px-1" aria-label={`Progreso: paso ${currentSlide + 1} de ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Ir al paso ${index + 1}`}
                aria-current={index === currentSlide ? "step" : undefined}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-200 ${index === currentSlide ? "w-10 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/45"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentSlide > 0 && (
              <Button type="button" variant="outline" onClick={() => setCurrentSlide((previous) => previous - 1)} className="h-12 w-12 shrink-0 rounded-2xl p-0" aria-label="Paso anterior">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Button type="button" onClick={nextSlide} className="h-12 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:bg-primary/90 active:scale-[0.98]">
              {isLast ? "Entrar a Lettora" : "Continuar"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Onboarding;
