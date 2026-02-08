import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, Moon, Sun, Globe, Lock, Download, HardDrive, Trash2,
  LogOut, Shield, Info, Mail, Eye, EyeOff, Loader2, Palette, Book,
  ChevronRight, Wifi, Heart, Check, X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { IOSSettingItem, IOSSettingSection } from "@/components/ios/IOSSettingItem";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { offlineBooks, removeBookOffline, getStorageUsage } = useOfflineStorage();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, languageNames, availableLanguages } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showReadingActivity, setShowReadingActivity] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      // Load profile settings from DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_private")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setPrivateProfile(profile.is_private || false);
      }

      const usage = await getStorageUsage();
      setStorageUsed(usage.used);

      const savedSettings = localStorage.getItem("lettora_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setNotifications(parsed.notifications ?? true);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setShowReadingActivity(parsed.showReadingActivity ?? true);
      }
      setLoading(false);
    };
    loadSettings();
  }, [navigate, getStorageUsage]);

  const saveSettings = (key: string, value: any) => {
    const current = JSON.parse(localStorage.getItem("lettora_settings") || "{}");
    localStorage.setItem("lettora_settings", JSON.stringify({ ...current, [key]: value }));
  };

  const handlePrivateProfileToggle = async (value: boolean) => {
    setPrivateProfile(value);
    if (user) {
      await supabase.from("profiles").update({ is_private: value }).eq("id", user.id);
    }
    saveSettings("privateProfile", value);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const clearOfflineBooks = async () => {
    for (const book of offlineBooks) {
      await removeBookOffline(book.id);
    }
    toast({ title: t("clearCache") });
    setShowClearCacheDialog(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      <IOSHeader title={t("settings")} large />

      <main className="space-y-7 pt-2">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4">
          <div
            onClick={() => navigate("/edit-profile")}
            className="flex items-center gap-4 p-4 bg-card rounded-2xl active:bg-muted/60 transition-colors cursor-pointer"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold">{t("myAccount")}</p>
              <p className="text-[15px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <IOSSettingSection title={t("appearance")}>
            <IOSSettingItem
              icon={theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              iconBg="bg-indigo-500"
              title={t("darkMode")}
              action={
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Palette className="w-4 h-4" />}
              iconBg="bg-pink-500"
              title={t("readingTheme")}
              subtitle={t("customizeExperience")}
              onClick={() => toast({ title: t("comingSoon") })}
            />
            <IOSSettingItem
              icon={<Globe className="w-4 h-4" />}
              iconBg="bg-cyan-500"
              title={t("language")}
              value={languageNames[language]}
              onClick={() => setShowLanguagePicker(true)}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <IOSSettingSection title={t("notifications")}>
            <IOSSettingItem
              icon={<Bell className="w-4 h-4" />}
              iconBg="bg-red-500"
              title={t("pushNotifications")}
              action={
                <Switch
                  checked={notifications}
                  onCheckedChange={(v) => { setNotifications(v); saveSettings("notifications", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Mail className="w-4 h-4" />}
              iconBg="bg-blue-500"
              title={t("emailNotifications")}
              action={
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(v) => { setEmailNotifications(v); saveSettings("emailNotifications", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <IOSSettingSection title={t("privacy")}>
            <IOSSettingItem
              icon={<Shield className="w-4 h-4" />}
              iconBg="bg-green-500"
              title={t("privateProfile")}
              subtitle={t("privateProfileDesc")}
              action={
                <Switch
                  checked={privateProfile}
                  onCheckedChange={handlePrivateProfileToggle}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={showReadingActivity ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              iconBg="bg-purple-500"
              title={t("showReadingActivity")}
              action={
                <Switch
                  checked={showReadingActivity}
                  onCheckedChange={(v) => { setShowReadingActivity(v); saveSettings("showReadingActivity", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Lock className="w-4 h-4" />}
              iconBg="bg-gray-500"
              title={t("changePassword")}
              onClick={() => toast({ title: t("comingSoon") })}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <IOSSettingSection title={t("content")}>
            <IOSSettingItem
              icon={<Book className="w-4 h-4" />}
              iconBg="bg-orange-500"
              title={t("favoriteGenres")}
              subtitle={t("personalizeRecs")}
              onClick={() => toast({ title: t("comingSoon") })}
            />
            <IOSSettingItem
              icon={<Heart className="w-4 h-4" />}
              iconBg="bg-rose-500"
              title={t("favoriteAuthors")}
              onClick={() => toast({ title: t("comingSoon") })}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Storage */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <IOSSettingSection title={t("storage")}>
            <IOSSettingItem
              icon={<HardDrive className="w-4 h-4" />}
              iconBg="bg-gray-600"
              title={t("spaceUsed")}
              value={formatBytes(storageUsed)}
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Download className="w-4 h-4" />}
              iconBg="bg-teal-500"
              title={t("downloadedBooks")}
              value={`${offlineBooks.length}`}
              onClick={() => navigate("/library?tab=offline")}
            />
            <IOSSettingItem
              icon={<Wifi className="w-4 h-4" />}
              iconBg="bg-blue-400"
              title={t("wifiOnly")}
              action={<Switch defaultChecked onClick={(e) => e.stopPropagation()} />}
              showChevron={false}
            />
            <IOSSettingItem
              icon={<Trash2 className="w-4 h-4" />}
              title={t("clearCache")}
              onClick={() => setShowClearCacheDialog(true)}
              danger
            />
          </IOSSettingSection>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <IOSSettingSection>
            <IOSSettingItem
              icon={<Info className="w-4 h-4" />}
              iconBg="bg-gray-400"
              title={t("version")}
              value="1.0.0"
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <IOSSettingSection>
            <IOSSettingItem
              icon={<LogOut className="w-4 h-4" />}
              title={t("logout")}
              onClick={() => setShowLogoutDialog(true)}
              danger
            />
          </IOSSettingSection>
        </motion.div>
      </main>

      <IOSBottomNav />

      {/* Language Picker Modal */}
      <AnimatePresence>
        {showLanguagePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowLanguagePicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">{t("language")}</h2>
                <button onClick={() => setShowLanguagePicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-2 pb-8">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setShowLanguagePicker(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                      language === lang ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-[17px]">{languageNames[lang]}</span>
                    {language === lang && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logoutConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logoutDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              {t("logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Dialog */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDownloaded")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDownloadedDesc")} ({offlineBooks.length})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={clearOfflineBooks} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
