import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AnimatedLettoraIcon } from "@/components/AnimatedLettoraIcon";

type AuthMethod = "email" | "phone";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    phone: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Auto-limit date fields
    if (name === "birthDay" && (parseInt(value) > 31 || value.length > 2)) return;
    if (name === "birthMonth" && (parseInt(value) > 12 || value.length > 2)) return;
    if (name === "birthYear" && value.length > 4) return;
    setFormData({ ...formData, [name]: value });
  };

  const getBirthDate = () => {
    const { birthDay, birthMonth, birthYear } = formData;
    if (!birthDay || !birthMonth || !birthYear) return null;
    const year = birthYear.length === 2 ? `20${birthYear}` : birthYear;
    return `${year}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        if (authMethod === "email") {
          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            phone: formData.phone,
            password: formData.password,
          });
          if (error) throw error;
        }
        toast({
          title: "¡Bienvenido de vuelta!",
          description: "Has iniciado sesión correctamente.",
        });
        navigate("/home");
      } else {
        const birthDate = getBirthDate();
        const signUpData: any = {
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              username: formData.username,
              ...(birthDate && { birth_date: birthDate }),
            },
          },
        };

        if (authMethod === "email") {
          signUpData.email = formData.email;
        } else {
          signUpData.phone = formData.phone;
        }

        const { error } = await supabase.auth.signUp(signUpData);
        if (error) throw error;

        // Update birth_date in profiles if provided
        const { data: { user } } = await supabase.auth.getUser();
        if (user && birthDate) {
          await supabase.from("profiles").update({ birth_date: birthDate } as any).eq("id", user.id);
        }

        toast({
          title: "¡Cuenta creada!",
          description: "Revisa tu correo para verificar tu cuenta.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding (desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-primary-foreground">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-primary-foreground/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8"
          >
            <BookOpen className="w-12 h-12" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl font-display font-bold mb-4"
          >
            Lettora
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-primary-foreground/80 text-center max-w-md"
          >
            Donde las historias cobran vida y los escritores se conectan
          </motion.p>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-20 right-20 w-16 h-16 bg-primary-foreground/10 rounded-2xl backdrop-blur-sm"
          />
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute bottom-32 left-16 w-12 h-12 bg-primary-foreground/10 rounded-xl backdrop-blur-sm"
          />
        </div>
      </motion.div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <AnimatedLettoraIcon size="lg" />
          </div>

          {/* Login / Register toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
                isLogin ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
                !isLogin ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Auth method toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setAuthMethod("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                authMethod === "email"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Mail className="w-4 h-4" />
              Correo
            </button>
            <button
              onClick={() => setAuthMethod("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                authMethod === "phone"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Phone className="w-4 h-4" />
              Teléfono
            </button>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={`${isLogin}-${authMethod}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Username (register only) */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label htmlFor="username" className="text-sm font-medium">Nombre de usuario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="tu_nombre"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10 h-11 rounded-xl"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}

              {/* Email or Phone */}
              {authMethod === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">Número de teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+52 123 456 7890"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-11 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Birth date (register only) */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Fecha de nacimiento
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      name="birthDay"
                      type="number"
                      placeholder="DD"
                      value={formData.birthDay}
                      onChange={handleInputChange}
                      className="h-11 rounded-xl text-center"
                      min={1}
                      max={31}
                    />
                    <Input
                      name="birthMonth"
                      type="number"
                      placeholder="MM"
                      value={formData.birthMonth}
                      onChange={handleInputChange}
                      className="h-11 rounded-xl text-center"
                      min={1}
                      max={12}
                    />
                    <Input
                      name="birthYear"
                      type="number"
                      placeholder="AAAA"
                      value={formData.birthYear}
                      onChange={handleInputChange}
                      className="h-11 rounded-xl text-center"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Formato: DD / MM / AAAA</p>
                </motion.div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Entrar" : "Crear cuenta"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Social login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">o continúa con</span>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
