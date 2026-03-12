import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface IOSHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  transparent?: boolean;
  large?: boolean;
  className?: string;
}

export const IOSHeader = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  leftAction,
  transparent = false,
  large = false,
  className,
}: IOSHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all",
        transparent
          ? "bg-transparent"
          : "liquid-glass border-b border-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-[52px]">
        <div className="w-20 flex justify-start">
          {showBack ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-primary font-normal text-[17px] active:opacity-60 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Atrás</span>
            </button>
          ) : (
            leftAction
          )}
        </div>

        <div className="flex-1 text-center">
          {!large && (
            <>
              <h1 className="text-[17px] font-semibold truncate">{title}</h1>
              {subtitle && (
                <p className="text-[13px] text-muted-foreground">{subtitle}</p>
              )}
            </>
          )}
        </div>

        <div className="w-20 flex justify-end">{rightAction}</div>
      </div>

      {large && (
        <div className="px-4 pb-3">
          <h1 className="text-[34px] font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[15px] text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
    </header>
  );
};
