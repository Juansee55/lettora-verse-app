import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedAccount } from "@/hooks/useMultiAccount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  savedAccounts: SavedAccount[];
  currentEmail: string;
  onRemoveAccount: (email: string) => void;
  onAddAccount: () => void;
}

const AccountSwitcher = ({
  isOpen,
  onClose,
  savedAccounts,
  currentEmail,
  onRemoveAccount,
  onAddAccount,
}: AccountSwitcherProps) => {
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const handleSwitchAccount = async (email: string) => {
    if (email === currentEmail) {
      onClose();
      return;
    }

    setSwitching(true);
    try {
      // Cerrar sesión actual
      await supabase.auth.signOut();
      
      // Navegar a auth para que el usuario inicie sesión con la otra cuenta
      toast({
        title: "Cambiando cuenta",
        description: `Iniciando sesión como ${email}...`,
      });
      
      window.location.href = "/auth";
    } catch (error) {
      console.error("Error switching account:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de cuenta.",
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 ios-sheet p-6 pb-10 rounded-t-3xl"
          >
            <div className="ios-pull-indicator" />
            
            <h3 className="text-lg font-semibold mb-4 mt-2">Mis Cuentas</h3>

            {/* Cuentas guardadas */}
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {savedAccounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay cuentas guardadas
                </p>
              ) : (
                savedAccounts.map((account) => (
                  <motion.div
                    key={account.email}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="ios-section p-4 flex items-center gap-3"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt={account.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        account.displayName?.[0]?.toUpperCase() || "?"
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {account.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {account.email}
                      </p>
                    </div>

                    {/* Indicador de cuenta actual */}
                    {account.email === currentEmail && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                        <Check className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">
                          Actual
                        </span>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-1">
                      {account.email !== currentEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSwitchAccount(account.email)}
                          disabled={switching}
                        >
                          Cambiar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onRemoveAccount(account.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              {savedAccounts.length < 5 && (
                <Button
                  variant="ios"
                  className="w-full h-11 rounded-xl font-semibold"
                  onClick={onAddAccount}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Cuenta
                </Button>
              )}
              <Button
                variant="ios-secondary"
                className="w-full h-11 rounded-xl font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
              <Button
                variant="ios-secondary"
                className="w-full h-11 rounded-xl font-semibold"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AccountSwitcher;
