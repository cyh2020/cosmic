import type { CanvasKit } from 'canvaskit-wasm';
declare const CanvasKitInit: any;

export async function getCanvasKit(): Promise<CanvasKit> {
  return CanvasKitInit({
    locateFile: (file: string) => './bin/' + file,
  }).then((canvasKit: CanvasKit) => canvasKit);
}
