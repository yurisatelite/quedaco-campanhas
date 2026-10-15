import {
  parseNpcProfiles,
  parseDeclaredResources,
  parseSceneResourceRefs,
} from "./declared-resources.mjs";
import { clone, normalizeCampaign } from "./data.mjs";

/** Importa o texto inteiro e reconhece as tabelas de cenas do formato de campanha. */
export function campaignFromMarkdown(material, title = "Campanha importada") {
  const heading = material.match(/^#\s+(.+)$/m)?.[1];
  const campaign = normalizeCampaign({
    id:
      globalThis.crypto?.randomUUID?.() ||
      `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: heading || title,
    original: { material },
    working: { material },
    scenes: [],
  });
  const npcSection =
    material.match(
      /^##\s+(?:Personagens importantes|NPCs)[^\n]*\r?\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/im,
    )?.[1] || "";
  campaign.npcProfiles = [
    ...npcSection.matchAll(
      /^###\s+(.+)\r?\n([\s\S]*?)(?=^###\s|$(?![\s\S]))/gm,
    ),
  ].map((match, index) => ({
    id: `npc-${index + 1}`,
    name: match[1].trim(),
    campaignRole: match[2].match(/\*\*Função:\*\*\s*(.+)/)?.[1] || "",
    behavior: match[2].trim(),
    actorUuid: "",
    actorName: "",
    actorImg: "",
  }));
  return enrichScenes(campaign, material);
}

export function enrichScenes(campaign, material) {
  const result = clone(campaign);
  result.npcProfiles = parseNpcProfiles(material, result.npcProfiles || []);
  result.resourceProfiles = parseDeclaredResources(
    material,
    result.resourceProfiles || [],
  );
  const previous = result.scenes;
  const blocks = [
    ...material.matchAll(
      /^###\s+C(\d+)\s*[-–]\s*(.+)\r?\n([\s\S]*?)(?=^###\s+C\d+|^##\s|$(?![\s\S]))/gm,
    ),
  ];
  result.scenes = blocks.length
    ? blocks.map((match, index) => {
        const fields = Object.fromEntries(
          [
            ...match[3].matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/gm),
          ].map((row) => [row[1].trim(), row[2].trim()]),
        );
        const sourceKey = `C${match[1].padStart(2, "0")}`;
        const existing =
          result.scenes.find(
            (scene) =>
              scene.sourceKey === sourceKey ||
              scene.id?.match(/^c(\d+)/i)?.[1]?.padStart(2, "0") ===
                match[1].padStart(2, "0"),
          ) || {};
        return {
          ...existing,
          id: existing.id || `c${match[1]}`,
          sourceKey,
          resourceRefs: [
            "NPCs",
            "Ameaças",
            "Monstros",
            "Loot",
            "Itens",
            "Recompensas",
          ].some((key) => fields[key])
            ? parseSceneResourceRefs(fields, result)
            : existing.resourceRefs || [],
          title: match[2].trim(),
          kind: fields.Tipo || existing.kind || "narrativa",
          narration:
            match[3]
              .match(
                /^####\s+(?:Narração|Texto para narrar)[^\n]*\r?\n([\s\S]*?)(?=^####\s|$(?![\s\S]))/im,
              )?.[1]
              ?.trim() ||
            fields.Narração ||
            fields["Texto para narrar"] ||
            existing.narration ||
            "",
          presentation: fields.Apresentação?.toLowerCase().includes("imagem")
            ? "image"
            : existing.presentation,
          image: fields.Imagem || existing.image || "",
          objective: fields.Objetivo || existing.objective || "",
          purpose:
            fields.Papel || fields["Ação central"] || existing.purpose || "",
          information:
            fields["Revelação obrigatória"] ||
            fields.Informação ||
            fields.Descoberta ||
            "",
          success: fields.Sucesso || fields.Saída || "",
          failure: fields.Falha || "",
          details: match[3].trim(),
          notes: existing.notes || "",
        };
      })
    : result.scenes;
  if (previous.length && blocks.length) {
    const parsed = result.scenes;
    result.scenes = [
      ...previous.map(
        (scene) => parsed.find((row) => row.id === scene.id) || scene,
      ),
      ...parsed.filter((row) => !previous.some((scene) => scene.id === row.id)),
    ];
  }
  return normalizeCampaign(result);
}

export function scenePreparation(entry) {
  return {
    purpose: String(entry?.purpose || ""),
    information: String(entry?.information || ""),
    success: String(entry?.success || ""),
    failure: String(entry?.failure || ""),
    details: String(entry?.details || ""),
    notes: String(entry?.notes || ""),
    npcProfileIds: [
      ...new Set(
        (Array.isArray(entry?.npcProfileIds) ? entry.npcProfileIds : []).map(
          String,
        ),
      ),
    ],
  };
}
