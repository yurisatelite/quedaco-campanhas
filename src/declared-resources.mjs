import { normalizeName } from "./names.mjs";
const key = (kind, name) =>
  `${kind}:${normalizeName(name).replaceAll(" ", "-")}`;
export function resourceDefinitions(campaign) {
  return [
    ...campaign.npcProfiles.map((npc) => ({
      id: `npc:${npc.id}`,
      kind: "npc",
      name: npc.name,
      description: [npc.campaignRole, npc.behavior].filter(Boolean).join("\n"),
      uuid: npc.actorUuid,
      bindingName: npc.actorName,
      img: npc.actorImg,
    })),
    ...(campaign.resourceProfiles || []),
  ];
}

export function parseDeclaredResources(material, existing = []) {
  const profiles = [];
  const sections = [
    ...material.matchAll(
      /^##\s+(Ameaças|Monstros|Itens(?: e loot| e recompensas)?|Recompensas|Loot)[^\n]*\r?\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/gim,
    ),
  ];
  for (const section of sections) {
    const kind = /amea|monstro/i.test(section[1]) ? "threat" : "item";
    for (const match of section[2].matchAll(
      /^###\s+(.+)\r?\n([\s\S]*?)(?=^###\s|$(?![\s\S]))/gm,
    )) {
      const name = match[1].trim(),
        id = key(kind, name),
        previous = existing.find((row) => row.id === id);
      profiles.push({
        ...previous,
        id,
        kind,
        name,
        description: match[2].trim(),
        uuid: previous?.uuid || "",
        bindingName: previous?.bindingName || "",
        img: previous?.img || "",
      });
    }
  }
  return [
    ...existing.filter(
      (row) => !profiles.some((profile) => profile.id === row.id),
    ),
    ...profiles,
  ];
}

export function parseSceneResourceRefs(fields, campaign) {
  const refs = [];
  for (const [field, kind] of [
    ["NPCs", "npc"],
    ["Ameaças", "threat"],
    ["Monstros", "threat"],
    ["Loot", "item"],
    ["Itens", "item"],
    ["Recompensas", "item"],
  ]) {
    for (const raw of String(fields[field] || "")
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      const quantity = Number(raw.match(/^(\d+)\s*[x×]?\s+/)?.[1]) || 1,
        name = raw.replace(/^\d+\s*[x×]?\s+/, "").trim();
      let profile = resourceDefinitions(campaign).find(
        (profile) =>
          profile.kind === kind &&
          normalizeName(profile.name) === normalizeName(name),
      );
      if (!profile) {
        profile = {
          id: key(kind, name),
          kind,
          name,
          description: "Declarado no texto desta cena.",
          uuid: "",
          bindingName: "",
          img: "",
        };
        campaign.resourceProfiles.push(profile);
      }
      refs.push({ id: profile.id, quantity });
    }
  }
  return refs;
}

export function resourcesForScene(campaign, scene) {
  const text = ` ${normalizeName([scene.title, scene.narration, scene.objective, scene.purpose, scene.information, scene.details, scene.notes].join(" "))} `;
  return resourceDefinitions(campaign).filter(
    (profile) =>
      (profile.kind === "npc" &&
        scene.npcProfileIds?.some((id) => `npc:${id}` === profile.id)) ||
      scene.resourceRefs?.some((ref) => ref.id === profile.id) ||
      text.includes(` ${normalizeName(profile.name)} `),
  );
}
export function parseNpcProfiles(material, existing = []) {
  const section =
    material.match(
      /^##\s+(?:NPCs|Personagens importantes)[^\n]*\r?\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/im,
    )?.[1] || "";
  const rows = [
    ...section.matchAll(/^###\s+(.+)\r?\n([\s\S]*?)(?=^###\s|$(?![\s\S]))/gm),
  ].map((match) => {
    const name = match[1].trim(),
      prior = existing.find(
        (row) => normalizeName(row.name) === normalizeName(name),
      );
    return {
      ...prior,
      id: prior?.id || key("npc", name),
      name,
      campaignRole:
        match[2].match(/\*\*Função:\*\*\s*(.+)/)?.[1] ||
        prior?.campaignRole ||
        "",
      behavior: match[2].trim(),
      actorUuid: prior?.actorUuid || "",
      actorName: prior?.actorName || "",
      actorImg: prior?.actorImg || "",
    };
  });
  return [
    ...existing.filter((row) => !rows.some((entry) => entry.id === row.id)),
    ...rows,
  ];
}
