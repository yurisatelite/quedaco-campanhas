/** Integração opcional e conservadora: só controla o preset nomeado pela própria campanha. */
export function fxMasterStatus() {
  const api = globalThis.FXMASTER?.api;
  return {
    available: Boolean(
      globalThis.game?.modules?.get("fxmaster")?.active || api,
    ),
    canPlay: typeof api?.presets?.play === "function",
    canStop: typeof api?.presets?.stop === "function",
  };
}

export async function playPreset(preset, scene) {
  const status = fxMasterStatus();
  if (!status.canPlay) throw Error("FXMaster não está disponível neste mundo.");
  if (!preset) throw Error("Informe o nome de um preset do FXMaster.");
  return globalThis.FXMASTER.api.presets.play(preset, { scene, silent: false });
}

export function presetNames() {
  try {
    const api = globalThis.FXMASTER?.api?.presets;
    return (api?.listValid?.() || api?.list?.() || [])
      .map((entry) => (typeof entry === "string" ? entry : entry.name))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function openFxEditor(map, kind = "particles") {
  if (!globalThis.game?.user?.isGM)
    throw Error("Somente a Mestra pode editar efeitos.");
  if (!map) throw Error("Escolha um mapa para editar seus efeitos.");
  if (globalThis.canvas?.scene?.id !== map.id) await map.view();
  const controlsUi = globalThis.ui?.controls,
    values = (collection) =>
      collection instanceof Map
        ? Array.from(collection.values())
        : Array.isArray(collection)
          ? collection
          : Object.values(collection || {}),
    controls = controlsUi?.controls,
    groups = values(controls);
  const group = groups.find((group) =>
    ["effects", "fxmaster"].includes(group.name),
  );
  const tools = values(group?.tools);
  const toolName = kind === "filters" ? "filters" : "particle-effects";
  const tool = tools.find(
    (tool) => tool.name === toolName,
  );
  if (typeof tool?.onChange === "function") return tool.onChange(null, true);
  if (typeof tool?.onClick === "function") return tool.onClick();
  // Foundry mais novo pode materializar ferramentas apenas após ativar o grupo.
  if (typeof controlsUi?.initialize === "function") {
    await controlsUi.initialize({ control: group?.name || "effects", tool: toolName });
    const element = controlsUi.element?.[0] || controlsUi.element || document;
    const button = element?.querySelector?.(
      `[data-control="${group?.name || "effects"}"] [data-tool="${toolName}"], [data-tool="${toolName}"]`,
    );
    if (button) {
      button.click();
      return true;
    }
  }
  throw Error(
    "O controle visual do FXMaster ainda não está disponível. Abra os controles de efeitos do mapa e tente novamente.",
  );
}

export async function applyStoredSceneFx(scene, map) {
  if (!scene?.fx?.enabled || !scene.fx.preset || !fxMasterStatus().canPlay)
    return false;
  const api = globalThis.FXMASTER.api.presets;
  const active =
    typeof api.listActive === "function"
      ? await api.listActive({ scene: map })
      : null;
  if (Array.isArray(active) && active.includes(scene.fx.preset)) return false;
  if (!active) {
    const effects = map.getFlag?.("fxmaster", "effects") || {},
      filters = map.getFlag?.("fxmaster", "filters") || {};
    if (
      Object.keys({ ...effects, ...filters }).some((key) =>
        key.startsWith(`apiPreset_${scene.fx.preset}_`),
      )
    )
      return false;
  }
  await playPreset(scene.fx.preset, map);
  return true;
}

export async function stopPreset(preset, scene) {
  const status = fxMasterStatus();
  if (!status.canStop)
    throw Error("Este FXMaster não permite parar presets por API.");
  if (!preset) throw Error("Esta cena não possui um preset definido.");
  return globalThis.FXMASTER.api.presets.stop(preset, { scene });
}
