"use client";
import { create } from "zustand";

interface RAIState {
  animations: boolean;
  pulse: boolean;
  diagnostics: boolean;
  toggleAnimations: () => void;
  togglePulse: () => void;
  toggleDiagnostics: () => void;
}

export const useRAIState = create<RAIState>((set) => ({
  animations: true,
  pulse: true,
  diagnostics: true,
  toggleAnimations: () => set((state) => ({ animations: !state.animations })),
  togglePulse: () => set((state) => ({ pulse: !state.pulse })),
  toggleDiagnostics: () =>
    set((state) => ({ diagnostics: !state.diagnostics })),
}));
