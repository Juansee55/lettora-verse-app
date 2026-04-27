import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "lettora_update_banner_hidden_1_9_1";

const UpdateBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem(STORAGE_KEY);
    if (!hidden) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)",
        color: "white",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        position: "relative",
        zIndex: 9999,
        fontSize: "14px",
        fontWeight: 500,
        letterSpacing: "0.01em",
        boxShadow: "0 2px 8px rgba(124, 58, 237, 0.35)",
        minHeight: "42px",
      }}
    >
      {/* Shimmer overlay */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.5s infinite",
          pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>

      <Sparkles
        size={16}
        style={{ animation: "pulse-icon 2s ease-in-out infinite", flexShrink: 0 }}
      />

      <span>
        🚀 <strong>Lettora 1.9.1</strong> Coming!
      </span>

      <button
        onClick={handleClose}
        aria-label="Ocultar banner"
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "50%",
          width: "22px",
          height: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          padding: 0,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.35)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.2)")
        }
      >
        <X size={13} />
      </button>
    </div>
  );
};

export default UpdateBanner;
