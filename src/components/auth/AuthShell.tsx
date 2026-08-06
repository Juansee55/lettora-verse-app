import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/** Fondo aurora violeta compartido por las pantallas de autenticación */
export const AuthBackground = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(var(--primary)/0.35),transparent_60%)]" />
    <motion.div
      className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full blur-[110px] bg-primary/30"
      animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-40 -right-24 w-[420px] h-[420px] rounded-full blur-[120px] bg-accent/25"
      animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
  </div>
);

/** Logotipo "L" de Lettora con destello */
export const LettoraMark = ({ size = 104 }: { size?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    style={{ width: size, height: size }}
    className="relative"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_30px_hsl(var(--primary)/0.55)]">
      <defs>
        <linearGradient id="lettora-l" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--foreground))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
        <linearGradient id="lettora-page" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <path d="M22 14h16v54h20v14H22z" fill="url(#lettora-l)" />
      <path d="M50 30c16 4 24 16 26 34-14-2-24-10-26-20z" fill="url(#lettora-page)" opacity="0.95" />
      <path d="M56 26c18 6 26 20 28 40-16-4-26-14-28-26z" fill="url(#lettora-page)" opacity="0.5" />
      <path d="M72 12l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="hsl(var(--foreground))" />
    </svg>
  </motion.div>
);

export const AuthField = ({
  icon: Icon,
  right,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  right?: React.ReactNode;
}) => (
  <div className="relative">
    <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" strokeWidth={1.8} />
    <input
      {...props}
      className="w-full h-[58px] pl-14 pr-14 rounded-full bg-foreground/[0.04] border border-primary/20 text-[15px] text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-xl transition-all focus:border-primary/60 focus:bg-foreground/[0.07] disabled:opacity-60"
    />
    {right && <div className="absolute right-5 top-1/2 -translate-y-1/2">{right}</div>}
  </div>
);

export const SocialRow = ({
  onGoogle,
  onApple,
  onEmail,
  disabled,
}: {
  onGoogle: () => void;
  onApple: () => void;
  onEmail: () => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-center gap-5">
    {[
      {
        key: "google",
        onClick: onGoogle,
        node: (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4h6.6c-.1 1.1-.9 2.8-2.5 3.9l3.8 3c2.3-2.1 3.6-5.2 3.6-8.7z" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-3c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-3.9 3C3.4 21.3 7.4 24 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-4-3.1C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4z" />
            <path fill="#EA4335" d="M12 4.8c2.2 0 3.7.9 4.5 1.7l3.3-3.2C17.9 1.4 15.2 0 12 0 7.4 0 3.4 2.7 1.3 6.6l4 3.1c1-2.9 3.6-4.9 6.7-4.9z" />
          </svg>
        ),
      },
      {
        key: "apple",
        onClick: onApple,
        node: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-foreground">
            <path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.7.9s-2-.9-3.2-.9C6.4 7.2 4.8 8.2 4 9.8c-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.4-1-2.4-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5z" />
          </svg>
        ),
      },
      {
        key: "email",
        onClick: onEmail,
        node: (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6 stroke-primary">
            <rect x="2.5" y="5" width="19" height="14" rx="3" />
            <path d="m3.5 7 8.5 6 8.5-6" />
          </svg>
        ),
      },
    ].map((b) => (
      <motion.button
        key={b.key}
        type="button"
        whileTap={{ scale: 0.92 }}
        disabled={disabled}
        onClick={b.onClick}
        className="w-16 h-16 rounded-full bg-foreground/[0.04] border border-primary/20 backdrop-blur-xl flex items-center justify-center transition-colors hover:border-primary/50 disabled:opacity-50"
      >
        {b.node}
      </motion.button>
    ))}
  </div>
);