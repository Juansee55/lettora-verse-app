import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, BookOpen, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { path: "/home", icon: Home, label: "Inicio" },
  { path: "/explore", icon: Search, label: "Explorar" },
  { path: "/library", icon: BookOpen, label: "Biblioteca" },
  { path: "/chats", icon: MessageCircle, label: "Mensajes" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const IOSBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-t border-border/30 pb-safe">
      <div className="flex items-center justify-around h-[50px] max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-1.5 bg-primary/10 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default IOSBottomNav;
