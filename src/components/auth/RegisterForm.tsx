import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ChevronLeft, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterFormProps {
  onSubmit: (email: string, password: string, username: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

const RegisterForm = ({ onSubmit, onBack, loading }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    username: false,
    password: false,
    confirmPassword: false,
  });

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isValidUsername = formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username);
  const isValidPassword = formData.password.length >= 8;
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password.length > 0;
  const isFormValid = isValidEmail && isValidUsername && isValidPassword && passwordsMatch;

  const containerVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
    exit: { opacity: 0, x: -100 },
  };

  const itemVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(formData.email, formData.password, formData.username);
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
    }
  };

  const renderFieldStatus = (isValid: boolean, isTouched: boolean) => {
    if (!isTouched) return null;
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          isValid ? "bg-green-500/20" : "bg-red-500/20"
        }`}
      >
        {isValid ? (
          <Check className="w-3 h-3 text-green-500" strokeWidth={3} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-red-500" />
        )}
      </motion.div>
    );
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
        <h2 className="text-3xl font-bold mb-2">Únete a Lettora Verse</h2>
        <p className="text-muted-foreground">Crea tu cuenta y comienza tu aventura</p>
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => setTouched({ ...touched, email: true })}
              className="pl-12 pr-12 h-12 rounded-xl border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-base"
              disabled={loading}
            />
            {renderFieldStatus(isValidEmail, touched.email)}
          </div>
        </motion.div>

        {/* Username Field */}
        <motion.div className="space-y-2" variants={itemVariants}>
          <Label htmlFor="username" className="text-sm font-medium">
            Nombre de Usuario
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
            <Input
              id="username"
              type="text"
              name="username"
              placeholder="tu_usuario"
              value={formData.username}
              onChange={handleChange}
              onBlur={() => setTouched({ ...touched, username: true })}
              className="pl-12 pr-12 h-12 rounded-xl border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-base"
              disabled={loading}
            />
            {renderFieldStatus(isValidUsername, touched.username)}
          </div>
          {touched.username && !isValidUsername && (
            <p className="text-xs text-red-500 mt-1">
              Mínimo 3 caracteres, solo letras, números y guiones bajos
            </p>
          )}
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
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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
          {touched.password && formData.password && !isValidPassword && (
            <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres</p>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div className="space-y-2" variants={itemVariants}>
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmar Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => setTouched({ ...touched, confirmPassword: true })}
              className="pl-12 pr-12 h-12 rounded-xl border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-base"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <Eye className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
          {touched.confirmPassword && formData.confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </motion.div>

        {/* Terms */}
        <motion.label className="flex items-start gap-3 cursor-pointer" variants={itemVariants}>
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-white/20 bg-muted/50 cursor-pointer mt-1"
            disabled={loading}
            required
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Acepto los Términos de Servicio y la Política de Privacidad
          </span>
        </motion.label>

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
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>
        </motion.div>
      </form>

      {/* Sign In Link */}
      <motion.p className="text-center text-sm text-muted-foreground mt-8" variants={itemVariants}>
        ¿Ya tienes cuenta?{" "}
        <button className="text-primary hover:underline font-semibold transition-colors">
          Inicia sesión
        </button>
      </motion.p>
    </motion.div>
  );
};

export default RegisterForm;
