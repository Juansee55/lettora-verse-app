import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthBackground } from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

type AuthStep = "login" | "register";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigate("/home");
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.session) {
        toast.success("¡Bienvenido de vuelta!");
        navigate("/home");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar sesión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username }, emailRedirectTo: `${window.location.origin}/home` },
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        toast.success("¡Cuenta creada! Verifica tu correo para continuar.");
        setStep("login");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear la cuenta");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) toast.error(error.message);
  };

  const handleApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) toast.error("Inicio con Apple no disponible por ahora");
  };

  const handleMagicLink = async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Escribe tu correo para enviarte un enlace de acceso");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    if (error) toast.error(error.message);
    else toast.success("Te enviamos un enlace de acceso a tu correo");
  };

  const handleForgotPassword = async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Escribe tu correo para restablecer la contraseña");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Revisa tu correo para restablecer la contraseña");
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-6 overflow-hidden">
      <AuthBackground />
      <AnimatePresence mode="wait">
        {step === "login" ? (
          <LoginForm
            key="login"
            onSubmit={handleLogin}
            onRegisterClick={() => setStep("register")}
            onForgotPassword={handleForgotPassword}
            onGoogle={handleGoogle}
            onApple={handleApple}
            onMagicLink={handleMagicLink}
            loading={loading}
          />
        ) : (
          <RegisterForm
            key="register"
            onSubmit={handleRegister}
            onBack={() => setStep("login")}
            onLoginClick={() => setStep("login")}
            onGoogle={handleGoogle}
            onApple={handleApple}
            onMagicLink={handleMagicLink}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
