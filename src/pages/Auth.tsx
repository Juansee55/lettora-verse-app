import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WelcomeScreen from "@/components/auth/WelcomeScreen";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

type AuthStep = "welcome" | "login" | "register";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/home");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

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
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        toast.success("¡Cuenta creada! Verifica tu correo para continuar.");
        setStep("welcome");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear la cuenta");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <WelcomeScreen
            key="welcome"
            onLoginClick={() => setStep("login")}
            onRegisterClick={() => setStep("register")}
          />
        )}
        {step === "login" && (
          <LoginForm
            key="login"
            onSubmit={handleLogin}
            onBack={() => setStep("welcome")}
            loading={loading}
          />
        )}
        {step === "register" && (
          <RegisterForm
            key="register"
            onSubmit={handleRegister}
            onBack={() => setStep("welcome")}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
