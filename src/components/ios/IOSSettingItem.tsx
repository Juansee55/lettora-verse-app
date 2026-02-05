import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IOSSettingItemProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  showChevron?: boolean;
  className?: string;
}

export const IOSSettingItem = ({
  icon,
  iconBg = "bg-primary",
  title,
  subtitle,
  value,
  action,
  onClick,
  danger = false,
  showChevron = true,
  className,
}: IOSSettingItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-3.5 px-4 py-3 bg-card active:bg-muted/60 transition-colors cursor-pointer min-h-[52px]",
      danger && "text-destructive",
      className
    )}
  >
    <div
      className={cn(
        "w-[29px] h-[29px] rounded-[7px] flex items-center justify-center text-white shrink-0",
        danger ? "bg-destructive" : iconBg
      )}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("text-[17px] leading-tight", danger && "text-destructive")}>
        {title}
      </p>
      {subtitle && (
        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
    {value && (
      <span className="text-[17px] text-muted-foreground mr-1">{value}</span>
    )}
    {action}
    {onClick && showChevron && !action && (
      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
    )}
  </div>
);

interface IOSSettingSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}

export const IOSSettingSection = ({
  title,
  footer,
  children,
  className,
}: IOSSettingSectionProps) => (
  <div className={cn("space-y-1.5", className)}>
    {title && (
      <h3 className="text-[13px] font-normal text-muted-foreground uppercase tracking-wide px-5 mb-2">
        {title}
      </h3>
    )}
    <div className="bg-card rounded-xl overflow-hidden divide-y divide-border/50 mx-4">
      {children}
    </div>
    {footer && (
      <p className="text-[13px] text-muted-foreground px-5 pt-1.5">{footer}</p>
    )}
  </div>
);
