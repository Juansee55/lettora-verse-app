import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Save, Loader2, Award, MapPin, Globe, Calendar, BookOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BadgeSelector from "@/components/badges/BadgeSelector";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { IOSSettingItem, IOSSettingSection } from "@/components/ios/IOSSettingItem";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    avatar_url: "",
    cover_url: "",
    birth_date: "",
    is_private: false,
    followers_visibility: "all",
  });
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          display_name: data.display_name || "",
          username: data.username || "",
          bio: data.bio || "",
          location: data.location || "",
          website: data.website || "",
          avatar_url: data.avatar_url || "",
          cover_url: data.cover_url || "",
          birth_date: data.birth_date || "",
          is_private: data.is_private || false,
          followers_visibility: data.followers_visibility || "all",
        });
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
        if (data.cover_url) setCoverPreview(data.cover_url);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleImageUpload = async (file: File, type: "avatar" | "cover"): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleImageUpload(file, "avatar");
      if (url) { setAvatarPreview(url); setProfile(prev => ({ ...prev, avatar_url: url })); }
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleImageUpload(file, "cover");
      if (url) { setCoverPreview(url); setProfile(prev => ({ ...prev, cover_url: url })); }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatar_url: profile.avatar_url,
        cover_url: profile.cover_url,
        birth_date: profile.birth_date || null,
        is_private: profile.is_private,
        followers_visibility: profile.followers_visibility as any,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar el perfil.", variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado", description: "Los cambios se han guardado correctamente." });
      navigate("/profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <IOSHeader
        title="Editar perfil"
        rightAction={
          <Button variant="ios" size="ios-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        }
      />

      <div className="max-w-lg mx-auto space-y-6 py-4">
        {/* Cover */}
        <div className="px-4">
          <input type="file" ref={coverInputRef} onChange={handleCoverChange} accept="image/*" className="hidden" />
          <div
            onClick={() => coverInputRef.current?.click()}
            className="relative h-32 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-hero" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Avatar */}
          <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="-mt-12 ml-4 relative z-10 w-24 h-24 rounded-2xl overflow-hidden cursor-pointer border-4 border-background bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display font-bold text-primary-foreground">
                {profile.display_name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <IOSSettingSection title="Información personal">
          <div className="px-4 py-3 space-y-3">
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Nombre</label>
              <Input value={profile.display_name} onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))} placeholder="Tu nombre" className="rounded-xl" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Usuario</label>
              <Input value={profile.username} onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))} placeholder="@usuario" className="rounded-xl" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Bio</label>
              <Textarea value={profile.bio} onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder="Cuéntanos sobre ti..." className="rounded-xl min-h-[80px]" maxLength={160} />
              <span className="text-[11px] text-muted-foreground">{profile.bio.length}/160</span>
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Fecha de nacimiento</label>
              <Input type="date" value={profile.birth_date} onChange={(e) => setProfile(prev => ({ ...prev, birth_date: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
        </IOSSettingSection>

        {/* Links */}
        <IOSSettingSection title="Enlaces y ubicación">
          <div className="px-4 py-3 space-y-3">
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ubicación
              </label>
              <Input value={profile.location} onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))} placeholder="Ciudad, País" className="rounded-xl" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Globe className="w-3 h-3" /> Sitio web
              </label>
              <Input value={profile.website} onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))} placeholder="https://..." className="rounded-xl" />
            </div>
          </div>
        </IOSSettingSection>

        {/* Privacy */}
        <IOSSettingSection title="Privacidad">
          <IOSSettingItem
            icon={<Eye className="w-4 h-4" />}
            iconBg="bg-blue-500"
            title="Perfil privado"
            subtitle="Solo seguidores ven tu contenido"
            showChevron={false}
            action={
              <Switch
                checked={profile.is_private}
                onCheckedChange={(v) => setProfile(prev => ({ ...prev, is_private: v }))}
              />
            }
          />
          <IOSSettingItem
            icon={<EyeOff className="w-4 h-4" />}
            iconBg="bg-orange-500"
            title="Visibilidad seguidores"
            value={profile.followers_visibility === "all" ? "Todos" : profile.followers_visibility === "followers" ? "Seguidores" : "Nadie"}
            onClick={() => {
              const options: Array<"all" | "followers" | "nobody"> = ["all", "followers", "nobody"];
              const idx = options.indexOf(profile.followers_visibility as any);
              setProfile(prev => ({ ...prev, followers_visibility: options[(idx + 1) % 3] }));
            }}
          />
        </IOSSettingSection>

        {/* Badges */}
        <IOSSettingSection title="Personalización">
          <IOSSettingItem
            icon={<Award className="w-4 h-4" />}
            iconBg="bg-amber-500"
            title="Gestionar insignias"
            onClick={() => setShowBadgeSelector(true)}
          />
        </IOSSettingSection>
      </div>

      <BadgeSelector isOpen={showBadgeSelector} onClose={() => setShowBadgeSelector(false)} />
    </div>
  );
};

export default EditProfilePage;
