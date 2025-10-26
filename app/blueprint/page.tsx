import { useState } from "react";
import IntelligenceCore from "../../components/IntelligenceCore";
import ControlDock from "../../components/ControlDock";

export default function BlueprintPage() {
  const [coreSoundEnabled, setCoreSoundEnabled] = useState(false);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Blueprint visuals */}
      <IntelligenceCore coreSoundEnabled={coreSoundEnabled} />
      <ControlDock onToggleCoreSound={setCoreSoundEnabled} />
    </main>
  );
}
