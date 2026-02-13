import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface FloatingHeart {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

const FloatingHearts = () => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  useEffect(() => {
    const generated: FloatingHeart[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 12 + Math.random() * 16,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10,
    }));
    setHearts(generated);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((h) => (
        <Heart
          key={h.id}
          className="valentine-heart fill-current"
          style={{
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingHearts;
