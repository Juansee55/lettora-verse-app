import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { BookOpen, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, Phone, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthMethod = "email" | "phone";
type AuthStep = "welcome" | "form" | "verify" | "mfa";

const TRACK_WIDTH = 280;
const BALL_SIZE = 56;
const THRESHOLD = TRACK_WIDTH - BALL_SIZE - 8;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>("welcome");
  const [otpCode, setOtpCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "", password: "", username: "", phone: "", birthDay: "", birthMonth: "", birthYear: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Neon ball slider
  const ballX = useMotionValue(0);
  const trackProgress = useTransform(ballX, [0, THRESHOLD], [0, 1]);
  const trackGlow = useTransform(trackProgress, [0, 1], ["hsl(var(--primary) / 0.1)", "hsl(var(--primary) / 0.4)"]);
  const trackFillWidth = useTransform(trackProgress, [0, 1], ["0%", "100%"]);
  const trackTextOpacity = useTransform(trackProgress, [0, 0.4], [1, 0]);
  const [unlocked, setUnlocked] = useState(false);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const currentX = ballX.get();
    if (currentX >= THRESHOLD * 0.85) {
      setUnlocked(true);
      setTimeout(() => setStep("form"), 400);
    } else {
      ballX.set(0);
    }
  }, [ballX]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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

  const saveAccountToStorage = (email: string) => {
    const accounts = JSON.parse(localStorage.getItem("lettora_accounts") || "[]");
    if (!accounts.find((a: any) => a.email === email)) {
      accounts.push({ email, addedAt: new Date().toISOString() });
      localStorage.setItem("lettora_accounts", JSON.stringify(accounts));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        let result;
        if (authMethod === "email") {
          result = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
        } else {
          result = await supabase.auth.signInWithPassword({ phone: formData.phone, password: formData.password });
        }
        if (result.error) {
          if (result.error.message?.includes("Email not confirmed")) {
            setStep("verify");
            await supabase.auth.resend({ type: "signup", email: formData.email });
            toast({ title: "Verifica tu correo", description: "Te hemos enviado un código de verificación." });
            setLoading(false);
            return;
          }
          throw result.error;
        }
        if (result.data?.session === null && (result.data as any)?.user === null) {
          const factors = await supabase.auth.mfa.listFactors();
          if (factors.data && factors.data.totp && factors.data.totp.length > 0) {
            const factor = factors.data.totp[0];
            setMfaFactorId(factor.id);
            const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
            if (challenge.data) { setMfaChallengeId(challenge.data.id); setStep("mfa"); setLoading(false); return; }
          }
        }
        saveAccountToStorage(formData.email || formData.phone);
        toast({ title: "¡Bienvenido de vuelta!" });
        navigate("/home");
      } else {
        const birthDate = getBirthDate();
        const signUpData: any = {
          password: formData.password,
          options: { emailRedirectTo: `${window.location.origin}/home`, data: { username: formData.username, ...(birthDate && { birth_date: birthDate }) } },
        };
        if (authMethod === "email") signUpData.email = formData.email;
        else signUpData.phone = formData.phone;

        const { data, error } = await supabase.auth.signUp(signUpData);
        if (error) throw error;
        if (data?.user && !data.session) {
          setStep("verify");
          toast({ title: "¡Código enviado!", description: "Revisa tu correo electrónico." });
        } else if (data?.session) {
          saveAccountToStorage(formData.email || formData.phone);
          if (data.user && birthDate) await supabase.from("profiles").update({ birth_date: birthDate } as any).eq("id", data.user.id);
          toast({ title: "¡Cuenta creada!" });
          navigate("/home");
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Ha ocurrido un error", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: formData.email, token: otpCode, type: "email" });
      if (error) throw error;
      if (data?.session) {
        saveAccountToStorage(formData.email);
        const birthDate = getBirthDate();
        if (data.user && birthDate) await supabase.from("profiles").update({ birth_date: birthDate } as any).eq("id", data.user.id);
        toast({ title: "¡Verificado!" });
        navigate("/home");
      }
    } catch (error: any) {
      toast({ title: "Código inválido", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleVerifyMFA = async () => {
    if (otpCode.length !== 6 || !mfaFactorId || !mfaChallengeId) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code: otpCode });
      if (error) throw error;
      saveAccountToStorage(formData.email || formData.phone);
      toast({ title: "¡Bienvenido!" });
      navigate("/home");
    } catch (error: any) {
      toast({ title: "Código incorrecto", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleResendCode = async () => {
    try {
      await supabase.auth.resend({ type: "signup", email: formData.email });
      toast({ title: "Código reenviado" });
    } catch { toast({ title: "Error al reenviar", variant: "destructive" }); }
  };

  // --- Verification / MFA step ---
  if (step === "verify" || step === "mfa") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">{step === "mfa" ? "Autenticación en dos pasos" : "Verifica tu correo"}</h1>
          <p className="text-muted-foreground text-[15px] mb-8">
            {step === "mfa" ? "Ingresa el código de tu app de autenticación" : `Enviamos un código de 6 dígitos a ${formData.email}`}
          </p>
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup>
                {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button variant="hero" size="xl" className="w-full mb-4" disabled={loading || otpCode.length !== 6} onClick={step === "mfa" ? handleVerifyMFA : handleVerifyOTP}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar"}
          </Button>
          {step === "verify" && <button onClick={handleResendCode} className="text-sm text-primary hover:underline">¿No recibiste el código? Reenviar</button>}
          <button onClick={() => { setStep("form"); setOtpCode(""); }} className="block mx-auto mt-4 text-sm text-muted-foreground hover:text-foreground">Volver al inicio</button>
        </motion.div>
      </div>
    );
  }

  // --- Welcome screen with neon ball ---
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 overflow-hidden relative">
        {/* Background orbs */}
        <motion.div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />
        <motion.div className="absolute w-[250px] h-[250px] bg-accent/5 rounded-full blur-[80px] -translate-y-40" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 4, repeat: Infinity }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
            className="w-24 h-24 bg-primary/10 backdrop-blur-xl rounded-[28px] flex items-center justify-center border border-primary/20 shadow-glow mb-8"
          >
            <BookOpen className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-4xl font-display font-bold mb-2">Lettora</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="text-muted-foreground text-center text-[15px] mb-12 max-w-[260px]">Donde las historias cobran vida y los escritores se conectan</motion.p>

          {/* Neon Ball Slider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
            style={{ width: TRACK_WIDTH }}
          >
            {/* Track */}
            <motion.div
              className="h-[60px] rounded-full border border-primary/20 flex items-center px-1 overflow-hidden relative"
              style={{ background: trackGlow }}
            >
              {/* Fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full"
                style={{ width: trackFillWidth }}
              />
              {/* Track text */}
              <motion.span
                className="absolute inset-0 flex items-center justify-center text-[14px] font-medium text-muted-foreground pointer-events-none select-none"
                style={{ opacity: trackTextOpacity }}
              >
                Desliza para comenzar →
              </motion.span>

              {/* Ball */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: THRESHOLD }}
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                style={{ x: ballX }}
                className="relative z-10 w-[52px] h-[52px] rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center"
                whileTap={{ scale: 1.05 }}
              >
                {/* Glow */}
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-lg" />
                {/* Neon ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  animate={{ boxShadow: ["0 0 15px hsl(var(--primary) / 0.4)", "0 0 30px hsl(var(--primary) / 0.6)", "0 0 15px hsl(var(--primary) / 0.4)"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Inner */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl relative z-10">
                  <ArrowRight className="w-6 h-6 text-primary-foreground" />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-[11px] text-muted-foreground/40 tracking-wider uppercase"
          >
            Made by Lettora.Dev / PerriStudios
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // --- Auth form ---
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side desktop */}
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-primary-foreground">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-primary-foreground/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8">
            <BookOpen className="w-12 h-12" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-5xl font-display font-bold mb-4">Lettora</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-xl text-primary-foreground/80 text-center max-w-md">Donde las historias cobran vida</motion.p>
        </div>
      </motion.div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold">Lettora</h2>
          </div>

          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${isLogin ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}>Iniciar sesión</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${!isLogin ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}>Registrarse</button>
          </div>

          <div className="flex gap-2 mb-5">
            <button onClick={() => setAuthMethod("email")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${authMethod === "email" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              <Mail className="w-4 h-4" /> Correo
            </button>
            <button onClick={() => setAuthMethod("phone")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${authMethod === "phone" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              <Phone className="w-4 h-4" /> Teléfono
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form key={`${isLogin}-${authMethod}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5">
                  <Label htmlFor="username" className="text-sm font-medium">Nombre de usuario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="username" name="username" type="text" placeholder="tu_nombre" value={formData.username} onChange={handleInputChange} className="pl-10 h-11 rounded-xl" required={!isLogin} />
                  </div>
                </motion.div>
              )}
              {authMethod === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={handleInputChange} className="pl-10 h-11 rounded-xl" required />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">Número de teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="phone" name="phone" type="tel" placeholder="+52 123 456 7890" value={formData.phone} onChange={handleInputChange} className="pl-10 h-11 rounded-xl" required />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleInputChange} className="pl-10 pr-10 h-11 rounded-xl" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-4 h-4 text-muted-foreground" /> Fecha de nacimiento</Label>
                  <div className="flex gap-2">
                    <Input name="birthDay" type="number" placeholder="DD" value={formData.birthDay} onChange={handleInputChange} className="h-11 rounded-xl text-center" min={1} max={31} />
                    <Input name="birthMonth" type="number" placeholder="MM" value={formData.birthMonth} onChange={handleInputChange} className="h-11 rounded-xl text-center" min={1} max={12} />
                    <Input name="birthYear" type="number" placeholder="AAAA" value={formData.birthYear} onChange={handleInputChange} className="h-11 rounded-xl text-center" />
                  </div>
                  <p className="text-xs text-muted-foreground">Formato: DD / MM / AAAA</p>
                </motion.div>
              )}
              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                </div>
              )}
              <Button type="submit" variant="hero" size="xl" className="w-full group" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isLogin ? "Entrar" : "Crear cuenta"}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-background px-4 text-muted-foreground">o continúa con</span></div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
              }}>
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

          {/* Back to welcome */}
          <button onClick={() => { setStep("welcome"); setUnlocked(false); ballX.set(0); }} className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Volver al inicio
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
