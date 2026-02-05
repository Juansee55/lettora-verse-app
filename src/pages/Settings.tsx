import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
  Palette,
  Book,
  ChevronRight,
  Wifi,
  Heart,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { IOSSettingItem, IOSSettingSection } from "@/components/ios/IOSSettingItem";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
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

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { offlineBooks, removeBookOffline, getStorageUsage } = useOfflineStorage();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  
  const [darkMode, setDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showReadingActivity, setShowReadingActivity] = useState(true);
  
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      const usage = await getStorageUsage();
      setStorageUsed(usage.used);

      const savedSettings = localStorage.getItem('lettora_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setNotifications(parsed.notifications ?? true);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setPrivateProfile(parsed.privateProfile ?? false);
        setShowReadingActivity(parsed.showReadingActivity ?? true);
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
    <div className="min-h-screen bg-muted/30 pb-24">
      <IOSHeader title="Configuración" large />

      <main className="space-y-7 pt-2">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4"
        >
          <div
            onClick={() => navigate("/edit-profile")}
            className="flex items-center gap-4 p-4 bg-card rounded-2xl active:bg-muted/60 transition-colors cursor-pointer"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold">Mi cuenta</p>
              <p className="text-[15px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <IOSSettingSection title="Apariencia">
            <IOSSettingItem
              icon={darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              iconBg="bg-indigo-500"
              title="Modo oscuro"
              action={
                <Switch
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Palette className="w-4 h-4" />}
              iconBg="bg-pink-500"
              title="Tema de lectura"
              subtitle="Personaliza tu experiencia"
              onClick={() => toast({ title: "Próximamente" })}
            />
            <IOSSettingItem
              icon={<Globe className="w-4 h-4" />}
              iconBg="bg-cyan-500"
              title="Idioma"
              value="Español"
              onClick={() => toast({ title: "Próximamente" })}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <IOSSettingSection title="Notificaciones">
            <IOSSettingItem
              icon={<Bell className="w-4 h-4" />}
              iconBg="bg-red-500"
              title="Notificaciones push"
              action={
                <Switch
                  checked={notifications}
                  onCheckedChange={(v) => {
                    setNotifications(v);
                    saveSettings('notifications', v);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Mail className="w-4 h-4" />}
              iconBg="bg-blue-500"
              title="Notificaciones por email"
              action={
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(v) => {
                    setEmailNotifications(v);
                    saveSettings('emailNotifications', v);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <IOSSettingSection title="Privacidad">
            <IOSSettingItem
              icon={<Shield className="w-4 h-4" />}
              iconBg="bg-green-500"
              title="Perfil privado"
              action={
                <Switch
                  checked={privateProfile}
                  onCheckedChange={(v) => {
                    setPrivateProfile(v);
                    saveSettings('privateProfile', v);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={showReadingActivity ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              iconBg="bg-purple-500"
              title="Mostrar actividad de lectura"
              action={
                <Switch
                  checked={showReadingActivity}
                  onCheckedChange={(v) => {
                    setShowReadingActivity(v);
                    saveSettings('showReadingActivity', v);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Lock className="w-4 h-4" />}
              iconBg="bg-gray-500"
              title="Cambiar contraseña"
              onClick={() => toast({ title: "Próximamente" })}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <IOSSettingSection title="Contenido">
            <IOSSettingItem
              icon={<Book className="w-4 h-4" />}
              iconBg="bg-orange-500"
              title="Géneros favoritos"
              subtitle="Personaliza tus recomendaciones"
              onClick={() => toast({ title: "Próximamente" })}
            />
            <IOSSettingItem
              icon={<Heart className="w-4 h-4" />}
              iconBg="bg-rose-500"
              title="Autores favoritos"
              onClick={() => toast({ title: "Próximamente" })}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Storage */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <IOSSettingSection title="Almacenamiento">
            <IOSSettingItem
              icon={<HardDrive className="w-4 h-4" />}
              iconBg="bg-gray-600"
              title="Espacio usado"
              value={formatBytes(storageUsed)}
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Download className="w-4 h-4" />}
              iconBg="bg-teal-500"
              title="Libros descargados"
              value={`${offlineBooks.length}`}
              onClick={() => navigate("/library?tab=offline")}
            />
            <IOSSettingItem
              icon={<Wifi className="w-4 h-4" />}
              iconBg="bg-blue-400"
              title="Solo Wi-Fi para descargas"
              action={<Switch defaultChecked onClick={(e) => e.stopPropagation()} />}
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Trash2 className="w-4 h-4" />}
              title="Limpiar caché"
              onClick={() => setShowClearCacheDialog(true)}
              danger
            />
          </IOSSettingSection>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <IOSSettingSection>
            <IOSSettingItem
              icon={<Info className="w-4 h-4" />}
              iconBg="bg-gray-400"
              title="Versión"
              value="1.0.0"
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <IOSSettingSection>
            <IOSSettingItem
              icon={<LogOut className="w-4 h-4" />}
              title="Cerrar sesión"
              onClick={() => setShowLogoutDialog(true)}
              danger
            />
          </IOSSettingSection>
        </motion.div>
      </main>

      <IOSBottomNav />

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Dialog */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar libros descargados?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {offlineBooks.length} libros de tu dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearOfflineBooks} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
