import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import GlimpseCamera from "./GlimpseCamera";
import GlimpseGallery from "./GlimpseGallery";
import GlimpseEditor from "./GlimpseEditor";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}

type Step = "camera" | "gallery" | "editor";

const GlimpseCreator = ({ open, onClose, onPublished }: Props) => {
  const [step, setStep] = useState<Step>("camera");
  const [file, setFile] = useState<File | null>(null);

  if (!open) return null;

  const reset = () => { setFile(null); setStep("camera"); };

  return (
    <AnimatePresence mode="wait">
      {step === "camera" && (
        <GlimpseCamera
          key="camera"
          onClose={() => { reset(); onClose(); }}
          onOpenGallery={() => setStep("gallery")}
          onCapture={(f) => { setFile(f); setStep("editor"); }}
        />
      )}
      {step === "gallery" && (
        <GlimpseGallery
          key="gallery"
          onClose={() => { reset(); onClose(); }}
          onOpenCamera={() => setStep("camera")}
          onSelect={(files) => { setFile(files[0]); setStep("editor"); }}
        />
      )}
      {step === "editor" && (
        <GlimpseEditor
          key="editor"
          file={file}
          onClose={() => setStep(file ? "gallery" : "camera")}
          onPublished={() => { reset(); onPublished(); onClose(); }}
        />
      )}
    </AnimatePresence>
  );
};

export default GlimpseCreator;