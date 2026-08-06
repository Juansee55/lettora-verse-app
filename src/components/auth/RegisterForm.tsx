import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, AlertCircle, Check, ShieldCheck, ChevronRight } from "lucide-react";
import { AuthField, LettoraMark, SocialRow } from "./AuthShell";

interface RegisterFormProps {
  onSubmit: (email: string, password: string, username: string) => Promise<void>;
  onBack: () => void;
  onLoginClick: () => void;
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
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  exit: { opacity: 0, y: -12 },
};

const RegisterForm = ({ onSubmit, onBack, onLoginClick, onGoogle, onApple, onMagicLink, loading }: RegisterFormProps) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const validUsername = /^[a-zA-Z0-9_.]{3,20}$/.test(username);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validPassword = password.length >= 6;
  const matches = password === confirm && confirm.length > 0;
  const isValid = validUsername && validEmail && validPassword && matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!matches) return setError("Las contraseñas no coinciden");
    try {
      await onSubmit(email, password, username.toLowerCase());
    } catch (err: any) {
      setError(err?.message || "Error al crear la cuenta");
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
      <motion.button
        type="button"
        onClick={onBack}
        variants={item}
        className="absolute left-0 top-8 w-11 h-11 rounded-full bg-foreground/[0.06] border border-primary/20 backdrop-blur-xl flex items-center justify-center"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>

      <motion.div className="flex flex-col items-center mb-7 text-center" variants={item}>
        <LettoraMark size={88} />
        <h1 className="mt-4 text-[34px] leading-none font-bold tracking-tight">Crear cuenta</h1>
        <p className="mt-2.5 text-muted-foreground text-[15px] leading-snug px-4">
          Únete a Lettora y forma parte de historias que inspiran.
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <motion.div variants={item}>
          <AuthField
            icon={User}
            placeholder="Nombre de usuario"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            disabled={loading}
            right={username ? (
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${validUsername ? "border-primary text-primary" : "border-destructive text-destructive"}`}>
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            ) : undefined}
          />
        </motion.div>

        <motion.div variants={item}>
          <AuthField
            icon={Mail}
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
            autoComplete="new-password"
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

        <motion.div variants={item}>
          <AuthField
            icon={Lock}
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            right={
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="text-primary" aria-label="Mostrar contraseña">
                {showConfirm ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            }
          />
        </motion.div>

        <motion.div variants={item} className="flex items-start gap-3 p-4 rounded-3xl bg-foreground/[0.04] border border-primary/15 backdrop-blur-xl">
          <ShieldCheck className="w-8 h-8 text-primary flex-shrink-0" strokeWidth={1.6} />
          <div className="flex-1">
            <p className="text-sm font-semibold">Tu privacidad es importante</p>
            <p className="text-[13px] text-muted-foreground leading-snug">
              No compartiremos tu información con nadie. Lee nuestra{" "}
              <a href="/settings/info" className="text-primary">Política de privacidad.</a>
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
        </motion.div>

        <motion.div variants={item} className="pt-2">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={!isValid || loading}
            className="w-full h-[60px] rounded-full font-semibold text-[17px] text-primary-foreground bg-gradient-to-r from-primary to-accent shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.7)] flex items-center justify-center gap-2 disabled:opacity-45 disabled:shadow-none transition-all"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creando cuenta…</>
            ) : (
              <>
                <span className="flex-1 text-center pl-7">Crear cuenta</span>
                <ArrowRight className="w-5 h-5 mr-7" />
              </>
            )}
          </motion.button>
        </motion.div>
      </form>

      <motion.div className="flex items-center gap-4 my-6" variants={item}>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o continúa con</span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>

      <motion.div variants={item}>
        <SocialRow onGoogle={onGoogle} onApple={onApple} onEmail={() => onMagicLink(email)} disabled={loading} />
      </motion.div>

      <motion.p className="mt-7 text-center text-[15px] text-muted-foreground" variants={item}>
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onLoginClick} className="text-primary font-semibold">Iniciar sesión</button>
      </motion.p>
    </motion.div>
  );
};

export default RegisterForm;
