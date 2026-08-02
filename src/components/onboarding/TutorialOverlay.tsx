import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface Step {
  route: string;
  selector?: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    route: "/home",
    selector: '[data-tour="nav-home"]',
    title: "Inicio",
    description: "Aquí encontrarás el contenido principal, las novedades y lo más destacado de la comunidad.",
  },
  {
    route: "/explore",
    selector: '[data-tour="nav-explore"]',
    title: "Explorar",
    description: "Descubre libros, escritores y publicaciones nuevas según tus gustos e intereses.",
  },
  {
    route: "/write",
    selector: '[data-tour="publish"]',
    title: "Publicar",
    description: "Desde aquí puedes crear publicaciones, escribir capítulos y compartir tus escritos con todos.",
  },
  {
    route: "/community",
    selector: '[data-tour="nav-community"]',
    title: "Comunidad",
    description: "Interactúa con otros lectores y escritores: comenta, reacciona y participa en conversaciones.",
  },
  {
    route: "/library",
    selector: '[data-tour="nav-library"]',
    title: "Biblioteca",
    description: "Guarda y organiza tus lecturas, retoma donde lo dejaste y sigue tu progreso.",
  },
  {
    route: "/profile",
    selector: '[data-tour="nav-profile"]',
    title: "Perfil",
    description: "Tu espacio personal: obras publicadas, estadísticas, insignias y logros.",
  },
  {
    route: "/profile",
    selector: '[data-tour="edit-profile"]',
    title: "Editar perfil",
    description: "Modifica tu foto, nombre, biografía y demás datos para que te conozcan mejor.",
  },
  {
    route: "/profile",
    selector: '[data-tour="settings"]',
    title: "Configuración",
    description: "Gestiona tu cuenta, privacidad, notificaciones y personalización de la app.",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;

const TutorialOverlay = ({ onFinish }: { onFinish: () => void }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    if (location.pathname !== step.route) navigate(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const measure = useCallback(() => {
    if (!step.selector) return setRect(null);
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return setRect(null);
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.selector]);

  useLayoutEffect(() => {
    setRect(null);
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(measure, 700);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, index, location.pathname]);

  const cardOnTop = rect ? rect.top > window.innerHeight / 2 : false;

  const content = (
    <div className="fixed inset-0 z-[2000]" role="dialog" aria-modal="true" aria-label="Tutorial de Lettora">
      {/* Dimmed backdrop with spotlight */}
      <AnimatePresence>
        {rect ? (
          <motion.div
            key="spot"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="absolute rounded-[20px] ring-2 ring-primary/80 pointer-events-none"
            style={{ boxShadow: "0 0 0 9999px hsl(0 0% 0% / 0.62), 0 0 32px hsl(var(--primary) / 0.55)" }}
          />
        ) : (
          <motion.div
            key="plain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />
        )}
      </AnimatePresence>

      {/* Card */}
      <div
        className={`absolute inset-x-0 px-4 flex justify-center ${
          rect ? (cardOnTop ? "top-[12vh]" : "bottom-[14vh]") : "top-1/2 -translate-y-1/2"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass-strong liquid-glass w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-border/40 bg-card/90 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                Paso {index + 1} de {STEPS.length}
              </span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-1.5">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

            {isLast && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 flex items-start gap-2 rounded-2xl bg-primary/10 p-3"
              >
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  ¡Ya estás listo para comenzar tu aventura en Lettora!
                </p>
              </motion.div>
            )}

            <div className="mt-5 flex items-center gap-2">
              {index > 0 && !isLast && (
                <Button variant="outline" className="rounded-full flex-1" onClick={() => setIndex((i) => i - 1)}>
                  Anterior
                </Button>
              )}
              <Button
                className="rounded-full flex-1"
                onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
              >
                {isLast ? "Comenzar a explorar" : "Siguiente"}
              </Button>
            </div>

            {!isLast && (
              <button
                onClick={onFinish}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Omitir tutorial
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default TutorialOverlay;