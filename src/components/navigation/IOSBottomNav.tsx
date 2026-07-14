import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, BookOpen, MessageCircle, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { path: "/home", icon: Home, label: "Inicio" },
  { path: "/explore", icon: Search, label: "Explorar" },
  { path: "/community", icon: Users, label: "Comunidad" },
  { path: "/library", icon: BookOpen, label: "Biblioteca" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const IOSBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 pb-safe">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="liquid-glass-strong liquid-glass rounded-[26px] mx-auto max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-around h-[60px] px-1.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className={cn(
                  "flex flex-col items-center justify-center h-full px-3 gap-0.5 relative rounded-2xl select-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.18, 1], rotate: [0, -6, 0] } : { scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.6 : 1.8} />
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -inset-3 bg-gradient-to-br from-primary/25 to-primary/10 rounded-2xl -z-10 shadow-[0_4px_16px_hsl(var(--primary)/0.35)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] transition-all mt-0.5",
                  isActive ? "font-semibold" : "font-medium opacity-70"
                )}>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
};

export default IOSBottomNav;
