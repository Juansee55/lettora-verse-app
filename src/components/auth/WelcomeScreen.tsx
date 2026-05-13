import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const WelcomeScreen = ({ onLoginClick, onRegisterClick }: WelcomeScreenProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center px-6 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* Logo and Title */}
      <motion.div
        className="flex flex-col items-center gap-6 mb-12"
        variants={containerVariants}
      >
        <motion.div
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30"
          variants={itemVariants}
          animate="animate"
          variants={floatingVariants}
        >
          <BookOpen className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div className="text-center" variants={itemVariants}>
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            Lettora
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Verse
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Donde las historias cobran vida
          </p>
        </motion.div>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div
        className="grid grid-cols-1 gap-4 mb-12 w-full max-w-sm"
        variants={containerVariants}
      >
        {[
          { icon: "📖", title: "Lee historias", desc: "Descubre miles de historias" },
          { icon: "✍️", title: "Escribe", desc: "Comparte tu creatividad" },
          { icon: "👥", title: "Conecta", desc: "Únete a una comunidad" },
        ].map((feature, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-white/10 backdrop-blur-sm hover:border-primary/50 transition-colors"
            variants={itemVariants}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--primary), 0.05)" }}
          >
            <span className="text-3xl">{feature.icon}</span>
            <div>
              <h3 className="font-semibold text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full max-w-sm"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Button
            onClick={onLoginClick}
            className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            Iniciar Sesión
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            onClick={onRegisterClick}
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold text-base border-white/20 hover:bg-muted/50 transition-all"
          >
            Crear Cuenta
          </Button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-8 text-xs text-muted-foreground text-center"
        variants={itemVariants}
      >
        Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
      </motion.p>
    </motion.div>
  );
};

export default WelcomeScreen;
