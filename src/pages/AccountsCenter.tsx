import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Shield, KeyRound, Smartphone, Monitor, Tablet, Tv,
  Laptop, LogOut, Trash2, Plus, Check, Loader2, ChevronRight, AlertTriangle,
  Lock, Eye, EyeOff, ShieldCheck, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMultiAccount } from "@/hooks/useMultiAccount";
import { getDeviceId } from "@/hooks/useSessionTracker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "accounts" | "security" | "devices";

interface SessionRow {
  id: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  user_agent: string | null;
  last_seen: string;
  created_at: string;
  revoked_at: string | null;
}

const platformIcon = (platform: string | null, ua: string | null) => {
  const p = (platform || "").toLowerCase();
  const u = (ua || "").toLowerCase();
  if (p.includes("ios") || u.includes("iphone")) return Smartphone;
  if (p.includes("ipad")) return Tablet;
  if (p.includes("android")) return Smartphone;
  if (p.includes("mac")) return Laptop;
  if (p.includes("windows")) return Monitor;
  if (p.includes("tv")) return Tv;
  return Monitor;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const AccountsCenter = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { savedAccounts, currentEmail, removeAccount, saveCurrentAccount } = useMultiAccount();

  const [tab, setTab] = useState<Tab>("accounts");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Devices
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const currentDeviceId = getDeviceId();

  // Password
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      setLoading(false);
      if (u) {
        loadSessions(u.id);
        loadMfa();
        saveCurrentAccount();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessions = async (userId: string) => {
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_seen", { ascending: false });
    if (!error && data) setSessions(data as SessionRow[]);
    setLoadingSessions(false);
  };

  const loadMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaFactors(data?.totp || []);
  };

  const revokeSession = async (session: SessionRow) => {
    if (session.device_id === currentDeviceId) {
      await supabase.auth.signOut();
      window.location.href = "/auth";
      return;
    }
    setRevokingId(session.id);
    const { error } = await supabase
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", session.id);
    setRevokingId(null);
    if (error) {
      toast({ title: "Error", description: "No se pudo cerrar la sesión", variant: "destructive" });
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== session.id));
    toast({ title: "Sesión cerrada", description: `${session.device_name || "Dispositivo"} ha sido desconectado` });
  };

  const revokeAllOthers = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .neq("device_id", currentDeviceId);
    if (error) {
      toast({ title: "Error", variant: "destructive", description: "No se pudo cerrar las sesiones" });
      return;
    }
    setSessions(prev => prev.filter(s => s.device_id === currentDeviceId));
    setConfirmRevokeAll(false);
    toast({ title: "Sesiones cerradas", description: "Se cerraron todas las sesiones en otros dispositivos" });
  };

  const handleChangePassword = async () => {
    if (newPwd.length < 8) {
      toast({ title: "Contraseña corta", description: "Mínimo 8 caracteres", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "No coinciden", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setChangingPwd(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewPwd(""); setConfirmPwd("");
    toast({ title: "Contraseña actualizada", description: "Tu contraseña se cambió correctamente" });
  };

  const enroll2FA = async () => {
    setMfaLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setMfaLoading(false);
    if (error || !data) {
      toast({ title: "Error", description: error?.message || "No se pudo iniciar 2FA", variant: "destructive" });
      return;
    }
    setMfaFactorId(data.id);
    setMfaQr(data.totp.qr_code);
    setMfaSecret(data.totp.secret);
  };

  const verify2FA = async () => {
    if (!mfaFactorId || !mfaCode) return;
    setMfaLoading(true);
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (!challenge) { setMfaLoading(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode,
    });
    setMfaLoading(false);
    if (error) {
      toast({ title: "Código inválido", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA activado", description: "Autenticación en dos pasos habilitada" });
    setMfaQr(null); setMfaSecret(null); setMfaFactorId(null); setMfaCode("");
    loadMfa();
  };

  const removeFactor = async (factorId: string) => {
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA desactivado" });
    loadMfa();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[17px] font-semibold">Centro de cuentas</h1>
            <p className="text-xs text-muted-foreground">Gestiona tus cuentas y seguridad</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex px-2 gap-1 pb-2">
          {([
            { id: "accounts", label: "Cuentas", icon: Users },
            { id: "security", label: "Seguridad", icon: Shield },
            { id: "devices", label: "Dispositivos", icon: Smartphone },
          ] as const).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="px-4 pt-4 space-y-4"
        >
          {tab === "accounts" && (
            <>
              <div className="bg-card rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                    {(user?.user_metadata?.display_name || user?.email || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user?.user_metadata?.display_name || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">ACTIVA</span>
                </div>
              </div>

              <div>
                <h3 className="text-[13px] uppercase tracking-wide text-muted-foreground px-2 mb-2">
                  Cuentas guardadas ({savedAccounts.length}/5)
                </h3>
                <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                  {savedAccounts.length === 0 && (
                    <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                      Aún no hay otras cuentas guardadas
                    </p>
                  )}
                  {savedAccounts.map(acc => (
                    <div key={acc.email} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold overflow-hidden">
                        {acc.avatarUrl
                          ? <img src={acc.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : acc.displayName?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{acc.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      </div>
                      {acc.email === currentEmail ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <button
                          onClick={() => removeAccount(acc.email)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                          aria-label="Eliminar cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
                variant="ios"
                className="w-full h-12 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir otra cuenta
              </Button>

              <Button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
                variant="ios-secondary"
                className="w-full h-12 rounded-2xl text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
            </>
          )}

          {tab === "security" && (
            <>
              {/* Password */}
              <div className="bg-card rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Cambiar contraseña</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Confirmar contraseña</Label>
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Repite la contraseña"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPwd || !newPwd || !confirmPwd}
                    className="w-full"
                  >
                    {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar contraseña"}
                  </Button>
                </div>
              </div>

              {/* 2FA */}
              <div className="bg-card rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Autenticación en dos pasos</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Añade una capa extra usando una app autenticadora (Google Authenticator, Authy…)
                </p>

                {mfaFactors.filter(f => f.status === "verified").length > 0 ? (
                  <div className="space-y-2">
                    {mfaFactors.filter(f => f.status === "verified").map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">2FA activo</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeFactor(f.id)}
                          disabled={mfaLoading}
                        >
                          Desactivar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : mfaQr ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl flex justify-center">
                      <img src={mfaQr} alt="QR 2FA" className="w-44 h-44" />
                    </div>
                    {mfaSecret && (
                      <p className="text-[11px] text-center text-muted-foreground break-all font-mono">
                        {mfaSecret}
                      </p>
                    )}
                    <Input
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      inputMode="numeric"
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <Button onClick={verify2FA} disabled={mfaLoading || mfaCode.length !== 6} className="w-full">
                      {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar y activar"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={enroll2FA} disabled={mfaLoading} className="w-full" variant="ios">
                    {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activar 2FA"}
                  </Button>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                <button
                  onClick={() => setTab("devices")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted"
                >
                  <Smartphone className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left text-sm font-medium">Dispositivos vinculados</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </>
          )}

          {tab === "devices" && (
            <>
              <div className="bg-card rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Dispositivos vinculados</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Estos son los dispositivos donde tu cuenta tiene sesión iniciada. Puedes cerrar sesión de forma remota.
                </p>
              </div>

              {loadingSessions ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                  {sessions.length === 0 && (
                    <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                      No hay dispositivos activos
                    </p>
                  )}
                  {sessions.map(s => {
                    const Icon = platformIcon(s.platform, s.user_agent);
                    const isCurrent = s.device_id === currentDeviceId;
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{s.device_name || "Dispositivo"}</p>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/15 text-primary font-semibold">
                                ESTE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(s.last_seen)}
                            {s.platform && <span>· {s.platform}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeSession(s)}
                          disabled={revokingId === s.id}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                          aria-label="Cerrar sesión"
                        >
                          {revokingId === s.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <LogOut className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {sessions.filter(s => s.device_id !== currentDeviceId).length > 0 && (
                <Button
                  onClick={() => setConfirmRevokeAll(true)}
                  variant="ios-secondary"
                  className="w-full h-12 rounded-2xl text-destructive"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cerrar sesión en todos los demás
                </Button>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar todas las otras sesiones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desconectará tu cuenta en todos los demás dispositivos. Tendrán que iniciar sesión de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={revokeAllOthers} className="bg-destructive">Cerrar todas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountsCenter;
