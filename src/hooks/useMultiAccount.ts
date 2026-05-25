import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavedAccount {
  email: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  addedAt: string;
}

export const useMultiAccount = () => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Cargar cuentas guardadas al iniciar
  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = useCallback(() => {
    try {
      const accounts = JSON.parse(localStorage.getItem("lettora_accounts") || "[]");
      setSavedAccounts(accounts);
    } catch (error) {
      console.error("Error loading saved accounts:", error);
      setSavedAccounts([]);
    }
  }, []);

  const saveCurrentAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    const accounts = JSON.parse(localStorage.getItem("lettora_accounts") || "[]");
    
    // Verificar si la cuenta ya existe
    const existingIndex = accounts.findIndex((a: SavedAccount) => a.email === user.email);
    
    const newAccount: SavedAccount = {
      email: user.email || "",
      userId: user.id,
      displayName: profile?.display_name || user.email?.split("@")[0],
      avatarUrl: profile?.avatar_url || "",
      addedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Actualizar cuenta existente
      accounts[existingIndex] = newAccount;
    } else {
      // Agregar nueva cuenta (máximo 5 cuentas)
      if (accounts.length >= 5) {
        toast({
          title: "Límite de cuentas",
          description: "Solo puedes guardar hasta 5 cuentas. Elimina una para agregar otra.",
          variant: "destructive",
        });
        return;
      }
      accounts.push(newAccount);
    }

    localStorage.setItem("lettora_accounts", JSON.stringify(accounts));
    setSavedAccounts(accounts);
    setCurrentEmail(user.email || "");
    setCurrentUserId(user.id);

    toast({
      title: "Cuenta guardada",
      description: `${user.email} ha sido guardada para acceso rápido.`,
    });
  }, [toast]);

  const switchAccount = useCallback(async (email: string) => {
    setLoading(true);
    try {
      // Aquí iría la lógica para cambiar de cuenta
      // Por ahora, solo navegamos a auth para que el usuario inicie sesión
      window.location.href = "/auth";
    } catch (error) {
      console.error("Error switching account:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de cuenta. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const removeAccount = useCallback((email: string) => {
    const accounts = JSON.parse(localStorage.getItem("lettora_accounts") || "[]");
    const filtered = accounts.filter((a: SavedAccount) => a.email !== email);
    localStorage.setItem("lettora_accounts", JSON.stringify(filtered));
    setSavedAccounts(filtered);
    
    toast({
      title: "Cuenta eliminada",
      description: `${email} ha sido removida de cuentas guardadas.`,
    });
  }, [toast]);

  const clearAllAccounts = useCallback(() => {
    localStorage.removeItem("lettora_accounts");
    setSavedAccounts([]);
    toast({
      title: "Cuentas eliminadas",
      description: "Todas las cuentas guardadas han sido eliminadas.",
    });
  }, [toast]);

  return {
    savedAccounts,
    currentEmail,
    currentUserId,
    loading,
    loadSavedAccounts,
    saveCurrentAccount,
    switchAccount,
    removeAccount,
    clearAllAccounts,
  };
};
