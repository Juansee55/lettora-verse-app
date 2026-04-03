import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, Moon, Sun, Globe, Lock, Download, HardDrive, Trash2,
  LogOut, Shield, Info, Mail, Eye, EyeOff, Loader2, Palette, Book,
  ChevronRight, Wifi, Heart, Check, X, Users, Cake, FileText, Newspaper,
  MessageSquare, Crown, Ban, KeyRound, UserX, AlertTriangle,
  MessageCircleHeart, BookHeart, UserPlus2, Swords, Trophy, Type, Zap,
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
  const [followersVisibility, setFollowersVisibility] = useState<"all" | "followers" | "nobody">("all");
  const [showFollowersVisibilityPicker, setShowFollowersVisibilityPicker] = useState(false);
  const [showReadingActivity, setShowReadingActivity] = useState(true);
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNameColorPicker, setShowNameColorPicker] = useState(false);
  const [nameColors, setNameColors] = useState<any[]>([]);
  const [currentNameColor, setCurrentNameColor] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showReadingThemePicker, setShowReadingThemePicker] = useState(false);
  const [readingTheme, setReadingTheme] = useState("dark");
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      // Load profile settings from DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_private, followers_visibility")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setPrivateProfile(profile.is_private || false);
        setFollowersVisibility((profile as any).followers_visibility || "all");
      }

      // Load favorite genres
      const { data: genreProfile } = await supabase
        .from("profiles")
        .select("favorite_genres")
        .eq("id", user.id)
        .maybeSingle();
      if (genreProfile?.favorite_genres) setFavoriteGenres(genreProfile.favorite_genres);

      // Load reading settings
      const readingSettings = localStorage.getItem("lettora_reading_settings");
      if (readingSettings) {
        try {
          const parsed = JSON.parse(readingSettings);
          setFontSize(parsed.fontSize || 18);
          setReadingTheme(parsed.theme || "dark");
        } catch {}
      }

      // Check admin role
      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);

      // Load name colors for admins
      if (adminStatus) {
        const { data: colors } = await supabase
          .from("profile_items")
          .select("id, name, css_value, image_url")
          .eq("item_type", "name_color");
        if (colors) setNameColors(colors);

        // Get current equipped color
        const { data: equipped } = await supabase
          .from("user_items")
          .select("item_id, profile_items(css_value)")
          .eq("user_id", user.id)
          .eq("is_equipped", true);
        if (equipped) {
          const colorItem = (equipped as any[]).find(e => e.profile_items?.css_value);
          if (colorItem) setCurrentNameColor(colorItem.profile_items.css_value);
        }
      }

      // Load MFA status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        setMfaFactors(factors.totp);
        setMfaEnrolled(factors.totp.some((f: any) => f.status === "verified"));
      }

      const usage = await getStorageUsage();
      setStorageUsed(usage.used);

      const savedSettings = localStorage.getItem("lettora_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setNotifications(parsed.notifications ?? true);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setShowReadingActivity(parsed.showReadingActivity ?? true);
        setNotifyLikes(parsed.notifyLikes ?? true);
        setNotifyComments(parsed.notifyComments ?? true);
        setNotifyFollowers(parsed.notifyFollowers ?? true);
        setNotifyMessages(parsed.notifyMessages ?? true);
      }

      // Load blocked users
      const { data: blocks } = await supabase
        .from("user_blocks" as any)
        .select("id, blocked_id")
        .eq("blocker_id", user.id);
      if (blocks) {
        const blockedIds = (blocks as any[]).map(b => b.blocked_id);
        if (blockedIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", blockedIds);
          setBlockedUsers(profiles || []);
        }
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

  const handleNameColorChange = async (colorItem: any) => {
    if (!user) return;
    setSavingColor(true);

    // Unequip all current name_color items
    const { data: userItems } = await supabase
      .from("user_items")
      .select("id, profile_items(item_type)")
      .eq("user_id", user.id)
      .eq("is_equipped", true);

    if (userItems) {
      for (const item of userItems as any[]) {
        if (item.profile_items?.item_type === "name_color") {
          await supabase.from("user_items").update({ is_equipped: false }).eq("id", item.id);
        }
      }
    }

    if (colorItem) {
      // Ensure user owns the item, if not insert it (admins get all colors)
      const { data: existing } = await supabase
        .from("user_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_id", colorItem.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_items").update({ is_equipped: true }).eq("id", existing.id);
      } else {
        await supabase.from("user_items").insert({ user_id: user.id, item_id: colorItem.id, is_equipped: true });
      }
      setCurrentNameColor(colorItem.css_value);
    } else {
      setCurrentNameColor(null);
    }

    setSavingColor(false);
    setShowNameColorPicker(false);
    toast({ title: "Color de nombre actualizado ✨" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("logout"), description: "¡Hasta pronto! 👋" });
    navigate("/auth");
  };

  const clearOfflineBooks = async () => {
    for (const book of offlineBooks) {
      await removeBookOffline(book.id);
    }
    toast({ title: t("clearCache") });
    setShowClearCacheDialog(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contraseña actualizada ✅" });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
    }
  };

  const handleUnblockUser = async (blockedId: string) => {
    if (!user) return;
    await (supabase.from("user_blocks" as any).delete().eq("blocker_id", user.id).eq("blocked_id", blockedId) as any);
    setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
    toast({ title: "Usuario desbloqueado" });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    // Delete profile (cascade will handle related data)
    if (user) {
      await supabase.from("profiles").delete().eq("id", user.id);
    }
    await supabase.auth.signOut();
    setDeletingAccount(false);
    toast({ title: "Cuenta eliminada", description: "Tu cuenta ha sido eliminada." });
    navigate("/auth");
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
              subtitle={readingTheme.charAt(0).toUpperCase() + readingTheme.slice(1)}
              onClick={() => setShowReadingThemePicker(true)}
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
            <IOSSettingItem
              icon={<Heart className="w-4 h-4" />}
              iconBg="bg-rose-500"
              title="Likes"
              subtitle="Notificar cuando alguien da like"
              action={
                <Switch
                  checked={notifyLikes}
                  onCheckedChange={(v) => { setNotifyLikes(v); saveSettings("notifyLikes", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<MessageCircleHeart className="w-4 h-4" />}
              iconBg="bg-orange-500"
              title="Comentarios"
              subtitle="Notificar nuevos comentarios"
              action={
                <Switch
                  checked={notifyComments}
                  onCheckedChange={(v) => { setNotifyComments(v); saveSettings("notifyComments", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<UserPlus2 className="w-4 h-4" />}
              iconBg="bg-green-500"
              title="Nuevos seguidores"
              subtitle="Notificar cuando alguien te sigue"
              action={
                <Switch
                  checked={notifyFollowers}
                  onCheckedChange={(v) => { setNotifyFollowers(v); saveSettings("notifyFollowers", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
            <IOSSettingItem
              icon={<MessageSquare className="w-4 h-4" />}
              iconBg="bg-violet-500"
              title="Mensajes"
              subtitle="Notificar nuevos mensajes"
              action={
                <Switch
                  checked={notifyMessages}
                  onCheckedChange={(v) => { setNotifyMessages(v); saveSettings("notifyMessages", v); }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <IOSSettingSection title={t("privacy")}>
            <IOSSettingItem
              icon={<Shield className="w-4 h-4" />}
              iconBg="bg-green-500"
              title={t("privateProfile")}
              subtitle="Solo tus seguidores ven tu contenido"
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
              icon={<Users className="w-4 h-4" />}
              iconBg="bg-indigo-500"
              title="Visibilidad de seguidores"
              subtitle={followersVisibility === "all" ? "Todos pueden ver" : followersVisibility === "followers" ? "Solo seguidores" : "Nadie puede ver"}
              onClick={() => setShowFollowersVisibilityPicker(true)}
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
              icon={<KeyRound className="w-4 h-4" />}
              iconBg="bg-gray-500"
              title={t("changePassword")}
              subtitle="Actualiza tu contraseña"
              onClick={() => setShowPasswordDialog(true)}
            />
            <IOSSettingItem
              icon={<Shield className="w-4 h-4" />}
              iconBg="bg-emerald-600"
              title="Autenticación en dos pasos"
              subtitle={mfaEnrolled ? "Activada ✓" : "Protege tu cuenta"}
              onClick={() => setShow2FASetup(true)}
            />
            <IOSSettingItem
              icon={<Ban className="w-4 h-4" />}
              iconBg="bg-amber-500"
              title="Usuarios bloqueados"
              value={blockedUsers.length > 0 ? `${blockedUsers.length}` : "0"}
              onClick={() => setShowBlockedUsers(true)}
            />
            <IOSSettingItem
              icon={<Trash2 className="w-4 h-4" />}
              title="Eliminar cuenta"
              subtitle="Elimina tu cuenta permanentemente"
              onClick={() => setShowDeleteAccountDialog(true)}
              danger
            />
          </IOSSettingSection>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <IOSSettingSection title={t("content")}>
            <IOSSettingItem
              icon={<Trophy className="w-4 h-4" />}
              iconBg="bg-amber-500"
              title="TOP Rankings"
              subtitle="Los mejores libros y poemas"
              onClick={() => navigate("/top-rankings")}
            />
            <IOSSettingItem
              icon={<Book className="w-4 h-4" />}
              iconBg="bg-orange-500"
              title={t("favoriteGenres")}
              subtitle={favoriteGenres.length > 0 ? favoriteGenres.slice(0, 3).join(", ") : t("personalizeRecs")}
              onClick={() => setShowGenrePicker(true)}
            />
            <IOSSettingItem
              icon={<Heart className="w-4 h-4" />}
              iconBg="bg-rose-500"
              title={t("favoriteAuthors")}
              subtitle="Descubre escritores que te gustan"
              onClick={() => navigate("/explore")}
            />
            <IOSSettingItem
              icon={<Type className="w-4 h-4" />}
              iconBg="bg-indigo-500"
              title="Tamaño de fuente"
              subtitle={`${fontSize}px`}
              onClick={() => setShowFontSizePicker(true)}
            />
            <IOSSettingItem
              icon={<Zap className="w-4 h-4" />}
              iconBg="bg-yellow-500"
              title="Lectura rápida"
              subtitle="Desplazamiento automático al leer"
              action={
                <Switch
                  defaultChecked={false}
                  onCheckedChange={(v) => saveSettings("autoScroll", v)}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              showChevron={false}
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

        {/* Admin Panel - only visible for admins */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <IOSSettingSection title="Administración">
              <IOSSettingItem
                icon={<Crown className="w-4 h-4" />}
                iconBg="bg-amber-500"
                title="Panel de Admin"
                subtitle="Gestionar usuarios, roles y moderación"
                onClick={() => navigate("/admin")}
              />
              <IOSSettingItem
                icon={<MessageSquare className="w-4 h-4" />}
                iconBg="bg-violet-500"
                title="Chat de Admins"
                subtitle="Chat general del equipo"
                onClick={() => navigate("/admin-chat")}
              />
              <IOSSettingItem
                icon={<Palette className="w-4 h-4" />}
                iconBg="bg-gradient-to-r from-pink-500 to-purple-500"
                title="Color de nombre"
                subtitle="Elige el color de tu nombre"
                onClick={() => setShowNameColorPicker(true)}
              />
              <IOSSettingItem
                icon={<Swords className="w-4 h-4" />}
                iconBg="bg-gradient-to-r from-red-500 to-orange-500"
                title="Gang Wars"
                subtitle="Bases, gangs y territorio"
                onClick={() => navigate("/gang-wars")}
              />
            </IOSSettingSection>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <IOSSettingSection title="Staff">
            <IOSSettingItem
              icon={<Newspaper className="w-4 h-4" />}
              iconBg="bg-emerald-500"
              title={t("news")}
              subtitle={t("newsDesc")}
              onClick={() => navigate("/news")}
            />
            <IOSSettingItem
              icon={<Cake className="w-4 h-4" />}
              iconBg="bg-pink-400"
              title={t("staffBday")}
              subtitle={t("staffBdayClosed")}
              onClick={() => navigate("/staff-bday")}
            />
            <IOSSettingItem
              icon={<FileText className="w-4 h-4" />}
              iconBg="bg-blue-500"
              title={t("staffContract")}
              subtitle={t("staffContractDesc")}
              onClick={() => navigate("/staff-contracts")}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Social & About */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <IOSSettingSection title="Comunidad">
            <IOSSettingItem
              icon={<Globe className="w-4 h-4" />}
              iconBg="bg-gradient-to-r from-pink-500 to-violet-500"
              title="Redes Sociales"
              subtitle="Síguenos en redes"
              onClick={() => navigate("/social-links")}
            />
            <IOSSettingItem
              icon={<MessageSquare className="w-4 h-4" />}
              iconBg="bg-teal-500"
              title="Propuestas"
              subtitle="Envía ideas y sugerencias"
              onClick={() => navigate("/proposals")}
            />
            <IOSSettingItem
              icon={<Users className="w-4 h-4" />}
              iconBg="bg-amber-500"
              title={t("team")}
              subtitle={t("teamDesc")}
              onClick={() => navigate("/admins")}
            />
            <IOSSettingItem
              icon={<Info className="w-4 h-4" />}
              iconBg="bg-gray-400"
              title={t("version")}
              value="1.8.1"
              showChevron={false}
            />
          </IOSSettingSection>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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

      {/* Followers Visibility Picker */}
      <AnimatePresence>
        {showFollowersVisibilityPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowFollowersVisibilityPicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">¿Quién puede ver tus seguidores?</h2>
                <button onClick={() => setShowFollowersVisibilityPicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-2 pb-8">
                {([
                  { value: "all", label: "Todos", desc: "Cualquiera puede ver tus seguidores" },
                  { value: "followers", label: "Solo seguidores", desc: "Solo quienes te siguen pueden verlos" },
                  { value: "nobody", label: "Nadie", desc: "Nadie puede ver tus seguidores" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      setFollowersVisibility(opt.value);
                      setShowFollowersVisibilityPicker(false);
                      if (user) {
                        await supabase.from("profiles").update({ followers_visibility: opt.value } as any).eq("id", user.id);
                      }
                      toast({ title: "Visibilidad actualizada" });
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                      followersVisibility === opt.value ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <span className="text-[17px] font-medium">{opt.label}</span>
                      <p className="text-[13px] text-muted-foreground">{opt.desc}</p>
                    </div>
                    {followersVisibility === opt.value && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <AlertDialogContent className="rounded-2xl max-w-[320px]">
          <AlertDialogHeader className="items-center text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2"
            >
              <LogOut className="w-6 h-6 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-[17px]">{t("logoutConfirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px]">{t("logoutDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90 rounded-xl w-full h-11 text-[15px] font-semibold"
            >
              {t("logout")}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl w-full h-11 text-[15px] mt-0">
              {t("cancel")}
            </AlertDialogCancel>
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

      {/* Name Color Picker */}
      <AnimatePresence>
        {showNameColorPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowNameColorPicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Color de nombre</h2>
                <button onClick={() => setShowNameColorPicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-2 pb-8 max-h-[60vh] overflow-y-auto">
                {/* Default / no color */}
                <button
                  onClick={() => handleNameColorChange(null)}
                  disabled={savingColor}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                    !currentNameColor ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-[17px]">Predeterminado</span>
                  {!currentNameColor && <Check className="w-5 h-5 text-primary" />}
                </button>
                {nameColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleNameColorChange(color)}
                    disabled={savingColor}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                      currentNameColor === color.css_value ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{color.image_url}</span>
                      <span className={`text-[17px] font-semibold ${color.css_value}`}>{color.name}</span>
                    </div>
                    {currentNameColor === color.css_value && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Dialog */}
      <AnimatePresence>
        {showPasswordDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowPasswordDialog(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Cambiar contraseña</h2>
                <button onClick={() => setShowPasswordDialog(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 pb-8 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center"
                >
                  {changingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "Actualizar contraseña"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocked Users Sheet */}
      <AnimatePresence>
        {showBlockedUsers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowBlockedUsers(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[70vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Usuarios bloqueados</h2>
                <button onClick={() => setShowBlockedUsers(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-2 pb-8 overflow-y-auto">
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-[15px]">No tienes usuarios bloqueados</p>
                  </div>
                ) : (
                  blockedUsers.map((blockedUser) => (
                    <div key={blockedUser.id} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                        {blockedUser.avatar_url ? (
                          <img src={blockedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          blockedUser.display_name?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px] truncate">{blockedUser.display_name || "Usuario"}</p>
                        <p className="text-[13px] text-muted-foreground">@{blockedUser.username || "user"}</p>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(blockedUser.id)}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive text-[13px] font-semibold rounded-lg"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="rounded-2xl max-w-[320px]">
          <AlertDialogHeader className="items-center text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2"
            >
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-[17px]">¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px]">
              Esta acción es permanente. Se eliminarán todos tus datos, libros, microrrelatos y seguidores. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="bg-destructive hover:bg-destructive/90 rounded-xl w-full h-11 text-[15px] font-semibold"
            >
              {deletingAccount ? <Loader2 className="w-5 h-5 animate-spin" /> : "Eliminar cuenta"}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl w-full h-11 text-[15px] mt-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Genre Picker */}
      <AnimatePresence>
        {showGenrePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowGenrePicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[70vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Géneros favoritos</h2>
                <button onClick={() => setShowGenrePicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 pb-8">
                <p className="text-[13px] text-muted-foreground mb-3">Selecciona hasta 5 géneros para personalizar tus recomendaciones</p>
                <div className="flex flex-wrap gap-2">
                  {["Romance","Fantasía","Misterio","Poesía","Drama","Aventura","Ciencia Ficción","Terror","No Ficción","Biografía","Autoayuda","Thriller","Humor","Juvenil","Ficción Histórica","Distopía","Cyberpunk","Erótica"].map((genre) => (
                    <button
                      key={genre}
                      onClick={async () => {
                        let updated: string[];
                        if (favoriteGenres.includes(genre)) {
                          updated = favoriteGenres.filter(g => g !== genre);
                        } else if (favoriteGenres.length < 5) {
                          updated = [...favoriteGenres, genre];
                        } else {
                          toast({ title: "Máximo 5 géneros" });
                          return;
                        }
                        setFavoriteGenres(updated);
                        if (user) {
                          await supabase.from("profiles").update({ favorite_genres: updated } as any).eq("id", user.id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                        favoriteGenres.includes(genre) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Font Size Picker */}
      <AnimatePresence>
        {showFontSizePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowFontSizePicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Tamaño de fuente</h2>
                <button onClick={() => setShowFontSizePicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-6 pb-8">
                <p className="text-center text-muted-foreground text-[13px] mb-4">Vista previa del texto</p>
                <div className="bg-muted/30 rounded-xl p-4 mb-6">
                  <p style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                    En un lugar de la Mancha, de cuyo nombre no quiero acordarme...
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] text-muted-foreground">A</span>
                  <input
                    type="range"
                    min={12}
                    max={28}
                    value={fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFontSize(val);
                      const saved = JSON.parse(localStorage.getItem("lettora_reading_settings") || "{}");
                      localStorage.setItem("lettora_reading_settings", JSON.stringify({ ...saved, fontSize: val }));
                    }}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[17px] font-medium">A</span>
                </div>
                <p className="text-center text-[13px] text-muted-foreground mt-2">{fontSize}px</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Theme Picker */}
      <AnimatePresence>
        {showReadingThemePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowReadingThemePicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Tema de lectura</h2>
                <button onClick={() => setShowReadingThemePicker(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 pb-8 space-y-2">
                {([
                  { value: "light", label: "Claro", desc: "Fondo blanco", preview: "bg-white text-gray-900" },
                  { value: "dark", label: "Oscuro", desc: "Fondo oscuro", preview: "bg-gray-900 text-gray-100" },
                  { value: "sepia", label: "Sepia", desc: "Tono cálido", preview: "bg-amber-50 text-amber-900" },
                  { value: "midnight", label: "Medianoche", desc: "Negro profundo", preview: "bg-slate-950 text-slate-200" },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setReadingTheme(t.value);
                      const saved = JSON.parse(localStorage.getItem("lettora_reading_settings") || "{}");
                      localStorage.setItem("lettora_reading_settings", JSON.stringify({ ...saved, theme: t.value }));
                      setShowReadingThemePicker(false);
                      toast({ title: `Tema: ${t.label}` });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      readingTheme === t.value ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${t.preview} flex items-center justify-center text-[11px] font-mono border border-border/20`}>
                      Aa
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[15px] font-medium">{t.label}</p>
                      <p className="text-[12px] text-muted-foreground">{t.desc}</p>
                    </div>
                    {readingTheme === t.value && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FASetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => { setShow2FASetup(false); setMfaQrCode(null); setMfaVerifyCode(""); }}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Autenticación en dos pasos</h2>
                <button onClick={() => { setShow2FASetup(false); setMfaQrCode(null); setMfaVerifyCode(""); }}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 pb-8 space-y-4">
                {mfaEnrolled ? (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-[17px] font-semibold">2FA Activada</p>
                      <p className="text-[13px] text-muted-foreground mt-1">Tu cuenta está protegida con autenticación de dos pasos</p>
                    </div>
                    <button
                      onClick={async () => {
                        setMfaLoading(true);
                        const verifiedFactor = mfaFactors.find((f: any) => f.status === "verified");
                        if (verifiedFactor) {
                          await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
                          setMfaEnrolled(false);
                          setMfaFactors([]);
                          toast({ title: "2FA desactivada" });
                        }
                        setMfaLoading(false);
                      }}
                      disabled={mfaLoading}
                      className="w-full h-11 bg-destructive/10 text-destructive rounded-xl font-semibold text-[15px] disabled:opacity-50"
                    >
                      {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Desactivar 2FA"}
                    </button>
                  </>
                ) : mfaQrCode ? (
                  <>
                    <p className="text-[13px] text-muted-foreground text-center">Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.)</p>
                    <div className="flex justify-center">
                      <img src={mfaQrCode} alt="QR Code" className="w-48 h-48 rounded-xl" />
                    </div>
                    {mfaSecret && (
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground mb-1">O ingresa este código manualmente:</p>
                        <p className="text-[13px] font-mono font-semibold tracking-wider select-all">{mfaSecret}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Código de verificación</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaVerifyCode}
                        onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm text-center tracking-[0.5em] font-mono"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (mfaVerifyCode.length !== 6 || !mfaFactorId) return;
                        setMfaLoading(true);
                        try {
                          const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
                          if (challenge.error) throw challenge.error;
                          const verify = await supabase.auth.mfa.verify({
                            factorId: mfaFactorId,
                            challengeId: challenge.data.id,
                            code: mfaVerifyCode,
                          });
                          if (verify.error) throw verify.error;
                          setMfaEnrolled(true);
                          setMfaQrCode(null);
                          setMfaVerifyCode("");
                          toast({ title: "2FA activada ✅", description: "Tu cuenta está protegida." });
                        } catch (error: any) {
                          toast({ title: "Código incorrecto", description: error.message, variant: "destructive" });
                        }
                        setMfaLoading(false);
                      }}
                      disabled={mfaLoading || mfaVerifyCode.length !== 6}
                      className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center"
                    >
                      {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Activar 2FA"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-[15px] text-muted-foreground">Añade una capa extra de seguridad a tu cuenta usando una app de autenticación</p>
                    </div>
                    <button
                      onClick={async () => {
                        setMfaLoading(true);
                        try {
                          const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Lettora 2FA" });
                          if (error) throw error;
                          setMfaQrCode(data.totp.qr_code);
                          setMfaSecret(data.totp.secret);
                          setMfaFactorId(data.id);
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                        setMfaLoading(false);
                      }}
                      disabled={mfaLoading}
                      className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center"
                    >
                      {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Configurar 2FA"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
