import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, FileText, Library, ArrowLeft, Sparkles } from "lucide-react";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

const writeOptions = [
  {
    id: "novel",
    icon: BookOpen,
    title: "Escribir Novela",
    description: "Historia con capítulos, personajes y arcos narrativos",
    gradient: "from-violet-500 to-purple-600",
    path: "/write/new?type=novel",
  },
  {
    id: "book",
    icon: FileText,
    title: "Escribir Libro",
    description: "Obra sin capítulos — poesía, ensayo o texto libre",
    gradient: "from-blue-500 to-cyan-500",
    path: "/write/new?type=book",
  },
  {
    id: "saga",
    icon: Library,
    title: "Crear Saga",
    description: "Serie de libros conectados bajo un mismo universo",
    gradient: "from-amber-500 to-orange-500",
    path: "/write/new?type=saga",
  },
];

const WriteSelectorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <h1 className="font-semibold text-[17px]">Crear</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-[22px] font-bold">¿Qué quieres crear?</h2>
          <p className="text-[15px] text-muted-foreground mt-1">Elige el formato que mejor se adapte a tu historia</p>
        </motion.div>

        <div className="space-y-3">
          {writeOptions.map((option, i) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(option.path)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl active:scale-[0.98] transition-transform text-left"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center flex-shrink-0`}>
                <option.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-semibold">{option.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <button
            onClick={() => navigate("/write/advanced")}
            className="w-full flex items-center justify-center gap-2 py-3 text-primary text-[15px] font-medium active:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            Editor avanzado
          </button>
        </motion.div>
      </main>

      <IOSBottomNav />
    </div>
  );
};

export default WriteSelectorPage;
