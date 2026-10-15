/** Integração opcional e conservadora: só controla o preset nomeado pela própria campanha. */
export function fxMasterStatus() {
  const api = globalThis.FXMASTER?.api;
  return {
    available: Boolean(api?.presets),
    canPlay: typeof api?.presets?.play === "function",
    canStop: typeof api?.presets?.stop === "function",
  };
}

export async function playPreset(preset, scene) {
  const status = fxMasterStatus();
  if (!status.canPlay) throw Error("FXMaster não está disponível neste mundo.");
  if (!preset) throw Error("Informe o nome de um preset do FXMaster.");
  return globalThis.FXMASTER.api.presets.play(preset, { scene });
}

export async function stopPreset(preset, scene) {
  const status = fxMasterStatus();
  if (!status.canStop)
    throw Error("Este FXMaster não permite parar presets por API.");
  if (!preset) throw Error("Esta cena não possui um preset definido.");
  return globalThis.FXMASTER.api.presets.stop(preset, { scene });
}
