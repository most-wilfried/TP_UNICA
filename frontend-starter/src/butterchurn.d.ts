declare module 'butterchurn' {
  export interface Visualizer {
    connectAudio(node: AudioNode): void;
    disconnectAudio(node: AudioNode): void;
    loadPreset(preset: object, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
  }
  export interface ButterchurnEngine {
    createVisualizer(context: AudioContext, canvas: HTMLCanvasElement,
      options: { width: number; height: number; pixelRatio?: number }): Visualizer;
  }
  const butterchurn: ButterchurnEngine | { default: ButterchurnEngine };
  export default butterchurn;
}
declare module 'butterchurn-presets' {
  const presets: { getPresets(): Record<string, object> };
  export default presets;
}
