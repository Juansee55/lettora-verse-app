import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Cake, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const StaffBdayPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">{t("back")}</span>
          </button>
          <h1 className="font-display font-semibold text-[17px]">Staff Bday</h1>
          <div className="w-16" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center px-8 pt-32"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <Cake className="w-12 h-12 text-primary/30 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-center">{t("staffBdayTitle")}</h2>
        <p className="text-muted-foreground text-center text-[15px] leading-relaxed max-w-xs">
          {t("staffBdayClosed")}
        </p>
      </motion.div>
    </div>
  );
};

export default StaffBdayPage;
