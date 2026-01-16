import { motion } from "framer-motion";
import {
  Type,
  AlignLeft,
  AlignJustify,
  Sun,
  Moon,
  Sunrise,
  Star,
  Minus,
  Plus,
  RotateCcw,
  BookOpen,
  Maximize,
  LayoutTemplate,
  Palette,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadingSettings } from "@/hooks/useReadingSettings";

interface ReadingSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ReadingSettings;
  onUpdateSetting: <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => void;
  onReset: () => void;
}

const themes = [
  { id: 'light', label: 'Claro', icon: Sun, colors: 'bg-white text-gray-900 border-gray-300' },
  { id: 'sepia', label: 'Sepia', icon: Sunrise, colors: 'bg-amber-50 text-amber-900 border-amber-300' },
  { id: 'dark', label: 'Oscuro', icon: Moon, colors: 'bg-gray-900 text-gray-100 border-gray-600' },
  { id: 'midnight', label: 'Noche', icon: Star, colors: 'bg-slate-950 text-slate-200 border-slate-700' },
] as const;

const fonts = [
  { id: 'serif', label: 'Serif', preview: 'Aa', family: "'Playfair Display', serif" },
  { id: 'sans-serif', label: 'Sans', preview: 'Aa', family: "'DM Sans', sans-serif" },
  { id: 'mono', label: 'Mono', preview: 'Aa', family: "'SF Mono', monospace" },
] as const;

const animations = [
  { id: 'slide', label: 'Deslizar' },
  { id: 'fade', label: 'Desvanecer' },
  { id: 'flip', label: 'Voltear' },
  { id: 'none', label: 'Ninguna' },
] as const;

export const ReadingSettingsSheet = ({
  open,
  onOpenChange,
  settings,
  onUpdateSetting,
  onReset,
}: ReadingSettingsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Configuración de lectura</span>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </Button>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="appearance" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="w-4 h-4 mr-1" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="typography" className="text-xs">
              <Type className="w-4 h-4 mr-1" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs">
              <List className="w-4 h-4 mr-1" />
              Comportamiento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6 mt-4">
            {/* Theme */}
            <div>
              <label className="text-sm font-medium mb-3 block">Tema</label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onUpdateSetting('theme', theme.id)}
                      className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${theme.colors} ${
                        settings.theme === theme.id
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Page Animation */}
            <div>
              <label className="text-sm font-medium mb-3 block">Animación de página</label>
              <div className="grid grid-cols-2 gap-2">
                {animations.map((anim) => (
                  <motion.button
                    key={anim.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUpdateSetting('pageAnimation', anim.id)}
                    className={`p-3 rounded-xl border transition-all ${
                      settings.pageAnimation === anim.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium">{anim.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Maximize className="w-4 h-4" />
                Márgenes
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'normal', 'wide'] as const).map((margin) => (
                  <Button
                    key={margin}
                    variant={settings.margin === margin ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdateSetting('margin', margin)}
                    className="rounded-xl capitalize"
                  >
                    {margin === 'compact' ? 'Compacto' : margin === 'normal' ? 'Normal' : 'Amplio'}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6 mt-4">
            {/* Font Size */}
            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-3">
                <span className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Tamaño de fuente
                </span>
                <span className="text-muted-foreground">{settings.fontSize}px</span>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onUpdateSetting('fontSize', Math.max(12, settings.fontSize - 1))}
                  className="rounded-xl"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={(v) => onUpdateSetting('fontSize', v[0])}
                  min={12}
                  max={28}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onUpdateSetting('fontSize', Math.min(28, settings.fontSize + 1))}
                  className="rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-3">
                <span className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Altura de línea
                </span>
                <span className="text-muted-foreground">{settings.lineHeight.toFixed(1)}</span>
              </label>
              <Slider
                value={[settings.lineHeight]}
                onValueChange={(v) => onUpdateSetting('lineHeight', v[0])}
                min={1.2}
                max={2.5}
                step={0.1}
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4" />
                Tipografía
              </label>
              <div className="grid grid-cols-3 gap-2">
                {fonts.map((font) => (
                  <motion.button
                    key={font.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUpdateSetting('fontFamily', font.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      settings.fontFamily === font.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span
                      className="block text-xl mb-1"
                      style={{ fontFamily: font.family }}
                    >
                      {font.preview}
                    </span>
                    <span className="text-xs text-muted-foreground">{font.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Text Align */}
            <div>
              <label className="text-sm font-medium mb-3 block">Alineación</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={settings.textAlign === 'left' ? 'default' : 'outline'}
                  onClick={() => onUpdateSetting('textAlign', 'left')}
                  className="rounded-xl"
                >
                  <AlignLeft className="w-4 h-4 mr-2" />
                  Izquierda
                </Button>
                <Button
                  variant={settings.textAlign === 'justify' ? 'default' : 'outline'}
                  onClick={() => onUpdateSetting('textAlign', 'justify')}
                  className="rounded-xl"
                >
                  <AlignJustify className="w-4 h-4 mr-2" />
                  Justificado
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6 mt-4">
            {/* Toggle Settings */}
            {[
              { key: 'showProgress', label: 'Mostrar barra de progreso', description: 'Ver el avance de lectura' },
              { key: 'tapNavigation', label: 'Navegación por toque', description: 'Tocar los lados para cambiar página' },
              { key: 'keepScreenOn', label: 'Mantener pantalla activa', description: 'Evita que se apague mientras lees' },
              { key: 'autoScroll', label: 'Auto-scroll', description: 'Desplazamiento automático del texto' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl border border-border"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() =>
                    onUpdateSetting(
                      item.key as keyof ReadingSettings,
                      !settings[item.key as keyof ReadingSettings]
                    )
                  }
                  className={`w-12 h-7 rounded-full transition-colors relative ${
                    settings[item.key as keyof ReadingSettings]
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                >
                  <motion.div
                    layout
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    style={{
                      left: settings[item.key as keyof ReadingSettings] ? 'calc(100% - 24px)' : '4px',
                    }}
                  />
                </motion.button>
              </div>
            ))}

            {/* Scroll Speed */}
            {settings.autoScroll && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-sm font-medium flex items-center justify-between mb-3">
                  <span>Velocidad de scroll</span>
                  <span className="text-muted-foreground">{settings.scrollSpeed}%</span>
                </label>
                <Slider
                  value={[settings.scrollSpeed]}
                  onValueChange={(v) => onUpdateSetting('scrollSpeed', v[0])}
                  min={10}
                  max={100}
                  step={5}
                />
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
