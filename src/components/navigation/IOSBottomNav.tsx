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
      <div className="liquid-glass rounded-[22px] mx-auto max-w-md overflow-hidden">
        <div className="flex items-center justify-around h-[56px] px-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center justify-center h-full px-3 gap-0.5 transition-all relative rounded-2xl",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -inset-2.5 bg-primary/12 rounded-2xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] transition-all",
                  isActive ? "font-semibold" : "font-medium opacity-70"
                )}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default IOSBottomNav;
