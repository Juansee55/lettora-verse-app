import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Save, Loader2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BadgeSelector from "@/components/badges/BadgeSelector";

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
  });
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
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
        });
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
        if (data.cover_url) setCoverPreview(data.cover_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "cover"
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

    // For now, we'll use a data URL since storage bucket might not be set up
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
      if (url) {
        setAvatarPreview(url);
        setProfile((prev) => ({ ...prev, avatar_url: url }));
      }
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleImageUpload(file, "cover");
      if (url) {
        setCoverPreview(url);
        setProfile((prev) => ({ ...prev, cover_url: url }));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

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
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display font-semibold">Editar perfil</h1>
            </div>
            <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Cover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverChange}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => coverInputRef.current?.click()}
            className="relative h-32 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-hero" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="-mt-16 ml-4 relative z-10"
        >
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl overflow-hidden cursor-pointer border-4 border-background bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center relative"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-display font-bold text-primary-foreground">
                {profile.display_name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Nombre
            </label>
            <Input
              value={profile.display_name}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, display_name: e.target.value }))
              }
              placeholder="Tu nombre"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Usuario
            </label>
            <Input
              value={profile.username}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="@usuario"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Bio
            </label>
            <Textarea
              value={profile.bio}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Cuéntanos sobre ti..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Ubicación
            </label>
            <Input
              value={profile.location}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Ciudad, País"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Sitio web
            </label>
            <Input
              value={profile.website}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default EditProfilePage;
