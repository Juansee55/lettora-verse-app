import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Bell,
  Moon,
  Sun,
  Globe,
  Lock,
  Download,
  HardDrive,
  Trash2,
  LogOut,
  Shield,
  Info,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ChevronRight,
  Palette,
  Book,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

const SettingItem = ({ icon, title, description, action, onClick, danger }: SettingItemProps) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={`flex items-center gap-4 p-4 rounded-2xl border border-border bg-card transition-colors cursor-pointer ${
      danger ? 'hover:bg-destructive/10 hover:border-destructive/50' : 'hover:bg-muted/50'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      danger ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`font-medium ${danger ? 'text-destructive' : ''}`}>{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      )}
    </div>
    {action || (onClick && <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
  </motion.div>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { offlineBooks, removeBookOffline, getStorageUsage } = useOfflineStorage();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  
  // Settings state
  const [darkMode, setDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showReadingActivity, setShowReadingActivity] = useState(true);
  const [language, setLanguage] = useState('es');
  
  // Dialogs
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Load storage usage
      const usage = await getStorageUsage();
      setStorageUsed(usage.used);

      // Load saved settings from localStorage
      const savedSettings = localStorage.getItem('lettora_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setNotifications(parsed.notifications ?? true);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setPrivateProfile(parsed.privateProfile ?? false);
        setShowReadingActivity(parsed.showReadingActivity ?? true);
        setLanguage(parsed.language ?? 'es');
      }

      setLoading(false);
    };

    loadSettings();
  }, [navigate, getStorageUsage]);

  const saveSettings = (key: string, value: any) => {
    const current = JSON.parse(localStorage.getItem('lettora_settings') || '{}');
    localStorage.setItem('lettora_settings', JSON.stringify({ ...current, [key]: value }));
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    document.documentElement.classList.toggle('dark', newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    toast({
      title: newValue ? "Modo oscuro activado" : "Modo claro activado",
      description: "El tema ha sido actualizado.",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const clearOfflineBooks = async () => {
    for (const book of offlineBooks) {
      await removeBookOffline(book.id);
    }
    toast({
      title: "Libros eliminados",
      description: "Todos los libros descargados han sido eliminados.",
    });
    setShowClearCacheDialog(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-display font-bold">Configuración</h1>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Cuenta
          </h2>
          
          <SettingItem
            icon={<User className="w-5 h-5" />}
            title="Editar perfil"
            description="Cambia tu foto, nombre y biografía"
            onClick={() => navigate("/edit-profile")}
          />
          
          <SettingItem
            icon={<Mail className="w-5 h-5" />}
            title="Correo electrónico"
            description={user?.email}
          />
          
          <SettingItem
            icon={<Lock className="w-5 h-5" />}
            title="Cambiar contraseña"
            description="Actualiza tu contraseña de acceso"
            onClick={() => {
              toast({
                title: "Próximamente",
                description: "Esta función estará disponible pronto.",
              });
            }}
          />
        </motion.section>

        {/* Preferences Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Preferencias
          </h2>
          
          <SettingItem
            icon={darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            title="Modo oscuro"
            description="Cambia el aspecto de la aplicación"
            action={
              <Switch
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />

          <SettingItem
            icon={<Palette className="w-5 h-5" />}
            title="Tema de lectura"
            description="Personaliza tu experiencia de lectura"
            onClick={() => navigate("/reading-settings")}
          />
          
          <SettingItem
            icon={<Globe className="w-5 h-5" />}
            title="Idioma"
            description="Selecciona tu idioma preferido"
            action={
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  saveSettings('language', value);
                }}
              >
                <SelectTrigger className="w-28" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <SettingItem
            icon={<Book className="w-5 h-5" />}
            title="Géneros favoritos"
            description="Personaliza tus recomendaciones"
            onClick={() => {
              toast({
                title: "Próximamente",
                description: "Esta función estará disponible pronto.",
              });
            }}
          />
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Notificaciones
          </h2>
          
          <SettingItem
            icon={<Bell className="w-5 h-5" />}
            title="Notificaciones push"
            description="Recibe alertas en tu dispositivo"
            action={
              <Switch
                checked={notifications}
                onCheckedChange={(value) => {
                  setNotifications(value);
                  saveSettings('notifications', value);
                  toast({
                    title: value ? "Notificaciones activadas" : "Notificaciones desactivadas",
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
          
          <SettingItem
            icon={<Mail className="w-5 h-5" />}
            title="Notificaciones por email"
            description="Recibe actualizaciones en tu correo"
            action={
              <Switch
                checked={emailNotifications}
                onCheckedChange={(value) => {
                  setEmailNotifications(value);
                  saveSettings('emailNotifications', value);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
        </motion.section>

        {/* Privacy Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Privacidad
          </h2>
          
          <SettingItem
            icon={<Shield className="w-5 h-5" />}
            title="Perfil privado"
            description="Solo tus seguidores pueden verte"
            action={
              <Switch
                checked={privateProfile}
                onCheckedChange={(value) => {
                  setPrivateProfile(value);
                  saveSettings('privateProfile', value);
                  toast({
                    title: value ? "Perfil privado" : "Perfil público",
                    description: value 
                      ? "Solo tus seguidores pueden ver tu perfil"
                      : "Cualquiera puede ver tu perfil",
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
          
          <SettingItem
            icon={showReadingActivity ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            title="Mostrar actividad de lectura"
            description="Permite que otros vean qué lees"
            action={
              <Switch
                checked={showReadingActivity}
                onCheckedChange={(value) => {
                  setShowReadingActivity(value);
                  saveSettings('showReadingActivity', value);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
        </motion.section>

        {/* Storage Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Almacenamiento
          </h2>
          
          <SettingItem
            icon={<HardDrive className="w-5 h-5" />}
            title="Almacenamiento usado"
            description={`${formatBytes(storageUsed)} • ${offlineBooks.length} libros descargados`}
          />
          
          <SettingItem
            icon={<Download className="w-5 h-5" />}
            title="Libros descargados"
            description="Gestiona tus libros offline"
            onClick={() => navigate("/library?tab=offline")}
          />
          
          <SettingItem
            icon={<Trash2 className="w-5 h-5" />}
            title="Limpiar caché"
            description="Elimina todos los libros descargados"
            onClick={() => setShowClearCacheDialog(true)}
            danger
          />
        </motion.section>

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Acerca de
          </h2>
          
          <SettingItem
            icon={<Info className="w-5 h-5" />}
            title="Versión de la app"
            description="1.0.0 (Build 2024)"
          />
        </motion.section>

        {/* Logout Button */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <SettingItem
            icon={<LogOut className="w-5 h-5" />}
            title="Cerrar sesión"
            description={user?.email}
            onClick={() => setShowLogoutDialog(true)}
            danger
          />
        </motion.section>
      </main>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Dialog */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar libros descargados?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {offlineBooks.length} libros de tu dispositivo. No podrás leerlos sin conexión hasta que los descargues de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearOfflineBooks} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
