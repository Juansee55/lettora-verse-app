import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackPath?: string;
  variant?: "ghost" | "glass" | "outline";
  className?: string;
}

const BackButton = ({
  fallbackPath = "/home",
  variant = "ghost",
  className = "",
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleBack}
      className={`rounded-xl ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
};

export default BackButton;
