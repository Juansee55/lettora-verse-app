import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Users, Heart, MessageCircle, Sparkles, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingSlide from "@/components/onboarding/OnboardingSlide";

const slides = [
  {
    icon: Sparkles,
    title: "Bienvenido a Lettora",
    description: "Tu nueva comunidad literaria donde las historias cobran vida y los escritores se conectan.",
    gradient: "bg-gradient-hero",
  },
  {
    icon: BookOpen,
    title: "Descubre Historias",
    description: "Explora miles de libros, poemas y escritos de autores emergentes y consagrados.",
    gradient: "bg-gradient-to-br from-violet-500 to-violet-600",
  },
  {
    icon: PenTool,
    title: "Escribe y Publica",
    description: "Crea tus propias obras, organiza sagas completas y compártelas con el mundo.",
    gradient: "bg-gradient-to-br from-violet-600 to-accent",
  },
  {
    icon: Users,
    title: "Conecta con Escritores",
    description: "Sigue a tus autores favoritos, colabora en proyectos y forma parte de la comunidad.",
    gradient: "bg-gradient-to-br from-accent to-violet-500",
  },
  {
    icon: MessageCircle,
    title: "Conversa y Comenta",
    description: "Chatea con otros lectores, comenta libros y participa en discusiones literarias.",
    gradient: "bg-gradient-to-br from-violet-500 to-violet-700",
  },
  {
    icon: Heart,
    title: "¿Listo para comenzar?",
    description: "Únete a miles de lectores y escritores que ya forman parte de Lettora.",
    gradient: "bg-gradient-hero",
  },
];

interface OnboardingProps {
  onComplete?: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleComplete = () => {
    onComplete?.();
    navigate("/auth");
  };

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      handleComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.12, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Skip button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-6 right-6"
        >
          <Button
            variant="ghost"
            onClick={handleComplete}
            className="text-muted-foreground hover:text-foreground"
          >
            Saltar
          </Button>
        </motion.div>

        {/* Slides */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <OnboardingSlide
              key={currentSlide}
              {...slides[currentSlide]}
              index={currentSlide}
            />
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pb-12 px-8"
        >
          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-4 max-w-md mx-auto">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={prevSlide}
                className="flex-1"
              >
                Anterior
              </Button>
            )}
            <Button
              variant="hero"
              size="lg"
              onClick={nextSlide}
              className={currentSlide === 0 ? "w-full" : "flex-1"}
            >
              {currentSlide === slides.length - 1 ? "Comenzar" : "Siguiente"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
