import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, ChevronLeft, AlertCircle, Apple, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

const LoginForm = ({ onSubmit, onBack, loading }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const isFormValid = isValidEmail && isValidPassword;

  const containerVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: { opacity: 0, x: -100 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(email, password);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  return (
    <motion.div
      className="w-full max-w-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.div className="mb-8" variants={itemVariants}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">Volver</span>
        </button>
        <h2 className="text-3xl font-bold mb-2">Bienvenido de Vuelta</h2>
        <p className="text-muted-foreground">Inicia sesión en tu cuenta para continuar</p>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-red-500">{error}</p>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <motion.div className="space-y-2" variants={itemVariants}>
          <Label htmlFor="email" className="text-sm font-medium">
            Correo Electrónico
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched({ ...touched, email: true })}
              className="pl-12 h-12 rounded-xl border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-base"
              disabled={loading}
            />
            {touched.email && email && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {isValidEmail ? (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div className="space-y-2" variants={itemVariants}>
          <Label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched({ ...touched, password: true })}
              className="pl-12 pr-12 h-12 rounded-xl border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-base"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <Eye className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </motion.div>

        {/* Remember Me & Forgot Password */}
        <motion.div
          className="flex items-center justify-between text-sm"
          variants={itemVariants}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/20 bg-muted/50 cursor-pointer"
              disabled={loading}
            />
            <span className="text-muted-foreground">Recuérdame</span>
          </label>
          <button
            type="button"
            className="text-primary hover:underline transition-colors font-medium"
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants} className="pt-2">
          <Button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </motion.div>
      </form>

      {/* Divider */}
      <motion.div className="relative my-8" variants={itemVariants}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-background text-muted-foreground">O continúa con</span>
        </div>
      </motion.div>

      {/* Social Login Buttons */}
      <motion.div className="grid grid-cols-2 gap-3" variants={itemVariants}>
        <Button
          variant="outline"
          className="h-12 rounded-xl border-white/20 hover:bg-muted/50 transition-all font-medium"
          disabled={loading}
        >
          <Apple className="w-5 h-5" strokeWidth={1.5} />
        </Button>
        <Button
          variant="outline"
          className="h-12 rounded-xl border-white/20 hover:bg-muted/50 transition-all font-medium"
          disabled={loading}
        >
          <Chrome className="w-5 h-5" strokeWidth={1.5} />
        </Button>
      </motion.div>

      {/* Sign Up Link */}
      <motion.p className="text-center text-sm text-muted-foreground mt-8" variants={itemVariants}>
        ¿No tienes cuenta?{" "}
        <button className="text-primary hover:underline font-semibold transition-colors">
          Regístrate aquí
        </button>
      </motion.p>
    </motion.div>
  );
};

export default LoginForm;
