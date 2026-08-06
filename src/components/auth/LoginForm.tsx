import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, Check } from "lucide-react";
import { AuthField, LettoraMark, SocialRow } from "./AuthShell";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onRegisterClick: () => void;
  onForgotPassword: (email: string) => void;
  onGoogle: () => void;
  onApple: () => void;
  onMagicLink: (email: string) => void;
  loading: boolean;
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: { opacity: 0, y: -12 },
};

const LoginForm = ({ onSubmit, onRegisterClick, onForgotPassword, onGoogle, onApple, onMagicLink, loading }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isValidEmail && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(email, password);
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión");
    }
  };

  return (
    <motion.div
      className="relative z-10 w-full max-w-sm mx-auto py-10"
      variants={container}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="flex flex-col items-center mb-9" variants={item}>
        <LettoraMark />
        <h1 className="mt-4 text-[40px] leading-none font-bold tracking-tight">Lettora</h1>
        <p className="mt-2 text-muted-foreground">Historias que conectan.</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={item}>
          <AuthField
            icon={User}
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </motion.div>

        <motion.div variants={item}>
          <AuthField
            icon={Lock}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            right={
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-primary" aria-label="Mostrar contraseña">
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            }
          />
        </motion.div>

        <motion.div className="flex items-center justify-between px-1 pt-1" variants={item}>
          <button type="button" onClick={() => setRemember((r) => !r)} className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${remember ? "border-primary bg-primary/15" : "border-muted-foreground/40"}`}>
              {remember && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}
            </span>
            <span className="text-sm text-muted-foreground">Recordarme</span>
          </button>
          <button type="button" onClick={() => onForgotPassword(email)} className="text-sm text-primary font-medium">
            ¿Olvidaste tu contraseña?
          </button>
        </motion.div>

        <motion.div variants={item} className="pt-3">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={!isFormValid || loading}
            className="w-full h-[60px] rounded-full font-semibold text-[17px] text-primary-foreground bg-gradient-to-r from-primary to-accent shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.7)] flex items-center justify-center gap-2 disabled:opacity-45 disabled:shadow-none transition-all"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Iniciando sesión…</>
            ) : (
              <>
                <span className="flex-1 text-center pl-7">Iniciar sesión</span>
                <ArrowRight className="w-5 h-5 mr-7" />
              </>
            )}
          </motion.button>
        </motion.div>
      </form>

      <motion.div className="flex items-center gap-4 my-7" variants={item}>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o continúa con</span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>

      <motion.div variants={item}>
        <SocialRow onGoogle={onGoogle} onApple={onApple} onEmail={() => onMagicLink(email)} disabled={loading} />
      </motion.div>

      <motion.button
        type="button"
        onClick={onRegisterClick}
        variants={item}
        className="mt-9 w-full h-[62px] rounded-full bg-foreground/[0.04] border border-primary/20 backdrop-blur-xl text-[15px] text-muted-foreground"
      >
        ¿No tienes cuenta? <span className="text-primary font-semibold">Crear cuenta</span>
      </motion.button>
    </motion.div>
  );
};

export default LoginForm;
