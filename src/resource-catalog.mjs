import { normalizeName } from "./names.mjs";
export { normalizeName } from "./names.mjs";
import { resourcesForScene } from "./declared-resources.mjs";
const EQUIPMENT = new Set([
  "weapon",
  "armor",
  "clothing",
  "equipment",
  "consumable",
  "loot",
  "sigil",
  "seal",
]);
const words = (value) =>
  normalizeName(value)
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      ["dois", "duas", "tres", "seis"].includes(word)
        ? word
        : word.endsWith("oes")
          ? word.slice(0, -3) + "ao"
          : word.length > 3 && word.endsWith("s")
            ? word.slice(0, -1)
            : word,
    )
    .join(" ");
const isAllowed = (row) =>
  row.documentName === "Actor" || EQUIPMENT.has(row.type);

export class ResourceCatalog {
  constructor(game) {
    this.game = game;
    this.entries = [];
    this.failures = [];
    this.loading = null;
  }
  async load(force = false) {
    if (this.loading && !force) return this.loading;
    this.loading = (async () => {
      const entries = [];
      this.failures = [];
      const add = (document, type, source) => {
        if (!document?.uuid) return;
        entries.push({
          uuid: document.uuid,
          name: document.name,
          img: document.img || "",
          type: document.type,
          documentName: type,
          source,
        });
      };
      for (const actor of this.game.actors ?? [])
        if (actor.visible !== false) add(actor, "Actor", "Mundo");
      for (const item of this.game.items ?? [])
        if (item.visible !== false) add(item, "Item", "Mundo");
      const api = this.game.modules?.get("quedaco")?.api;
      if (api?.family === "quedaco" && typeof api.listNpcs === "function")
        try {
          for (const row of await api.listNpcs())
            entries.push({
              ...row,
              documentName: "Actor",
              source: "Cadastro QUEDAÇO",
            });
        } catch (error) {
          this.failures.push(error.message);
        }
      const packs = Array.from(this.game.packs ?? []).filter(
        (pack) =>
          ["Actor", "Item"].includes(pack.documentName) &&
          pack.visible !== false &&
          (!pack.metadata?.system || pack.metadata.system === "skyfall"),
      );
      for (let index = 0; index < packs.length; index += 4) {
        const batch = packs.slice(index, index + 4);
        const results = await Promise.allSettled(
          batch.map(async (pack) => {
            const rows = await pack.getIndex({ fields: ["type", "img"] });
            for (const row of rows)
              entries.push({
                uuid:
                  row.uuid ||
                  `Compendium.${pack.collection}.${pack.documentName}.${row._id}`,
                name: row.name,
                img: row.img || "",
                type: row.type,
                documentName: pack.documentName,
                source: pack.metadata?.label || pack.collection,
              });
          }),
        );
        results.forEach((result, offset) => {
          if (result.status === "rejected")
            this.failures.push(
              `${batch[offset].collection}: ${result.reason?.message || result.reason}`,
            );
        });
      }
      const unique = new Map();
      for (const row of entries.filter(isAllowed)) {
        const key = `${row.documentName}:${normalizeName(row.name)}`;
        if (!unique.has(key)) unique.set(key, row);
      }
      this.entries = [...unique.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      );
      return this;
    })().catch((error) => {
      this.loading = null;
      throw error;
    });
    return this.loading;
  }
}

export function detectResources(scene, catalog) {
  const text = words(
    [
      scene.title,
      scene.narration,
      scene.objective,
      scene.purpose,
      scene.information,
      scene.details,
      scene.notes,
    ].join("\n"),
  );
  const haystack = ` ${text} `,
    matches = [],
    occupied = [];
  const quantities = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
  };
  for (const entry of [...catalog].sort(
    (a, b) => words(b.name).length - words(a.name).length,
  )) {
    const name = words(entry.name);
    if (
      !name ||
      name.length < 3 ||
      scene.excludedResources?.includes(entry.uuid)
    )
      continue;
    const position = haystack.indexOf(` ${name} `);
    const explicit = [scene.narration, scene.details, scene.notes].some(
      (value) => String(value || "").includes(`@UUID[${entry.uuid}]`),
    );
    if (position < 0 && !explicit) continue;
    if (
      !explicit &&
      occupied.some((range) => position >= range.start && position < range.end)
    )
      continue;
    const prefix = haystack
      .slice(Math.max(0, position - 45), position)
      .trimEnd();
    if (
      !explicit &&
      /(?:nao ha|nao existe|nao existem|sem|ausencia de)\s*(?:\w+\s+){0,2}$/.test(
        prefix,
      )
    )
      continue;
    const quantityWord = prefix.match(
      /(?:^|\s)(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis)$/,
    )?.[1];
    const quantity = Math.max(
      1,
      Math.min(99, Number(quantityWord) || quantities[quantityWord] || 1),
    );
    matches.push({ ...entry, quantity });
    if (position >= 0)
      occupied.push({ start: position, end: position + name.length + 2 });
  }
  return matches;
}

export function applyResourceMatches(campaign, catalog) {
  let found = 0;
  for (const profile of campaign.npcProfiles) {
    if (profile.actorUuid) continue;
    const match = catalog.find(
      (row) =>
        row.documentName === "Actor" &&
        normalizeName(row.name) === normalizeName(profile.name),
    );
    if (match) {
      profile.actorUuid = match.uuid;
      profile.actorName = match.name;
      profile.actorImg = match.img;
    }
  }
  for (const profile of campaign.resourceProfiles || []) {
    if (profile.uuid) continue;
    const match = catalog.find(
      (row) =>
        row.documentName === (profile.kind === "item" ? "Item" : "Actor") &&
        normalizeName(row.name) === normalizeName(profile.name),
    );
    if (match)
      Object.assign(profile, {
        uuid: match.uuid,
        bindingName: match.name,
        img: match.img,
      });
  }
  for (const scene of campaign.scenes) {
    scene.roster ??= [];
    scene.loot ??= [];
    scene.excludedResources ??= [];
    const matches = detectResources(scene, catalog);
    for (const profile of resourcesForScene(campaign, scene)) {
      if (!profile.uuid || scene.excludedResources.includes(profile.uuid))
        continue;
      const existing = matches.find((row) => row.uuid === profile.uuid);
      const quantity =
        scene.resourceRefs?.find((ref) => ref.id === profile.id)?.quantity ||
        existing?.quantity ||
        1;
      if (existing) Object.assign(existing, { name: profile.name, quantity });
      else
        matches.push({
          uuid: profile.uuid,
          name: profile.name,
          img: profile.img,
          documentName: profile.kind === "item" ? "Item" : "Actor",
          quantity,
        });
    }
    found += matches.length;
    scene.roster = scene.roster.filter((row) => row.source !== "auto");
    scene.loot = scene.loot.filter((row) => row.source !== "auto");
    for (const match of matches) {
      if (match.documentName === "Actor") {
        if (!scene.roster.some((row) => row.actorUuid === match.uuid))
          scene.roster.push({
            actorUuid: match.uuid,
            name: match.name,
            img: match.img,
            role: "Identificado no texto",
            quantity: match.quantity,
            hidden: false,
            roomId: "",
            source: "auto",
          });
      } else if (!scene.loot.some((row) => row.uuid === match.uuid))
        scene.loot.push({
          id: `auto-${match.uuid}`,
          uuid: match.uuid,
          name: match.name,
          img: match.img,
          quantity: match.quantity,
          hidden: true,
          roomId: "",
          notes: "",
          source: "auto",
        });
    }
  }
  return found;
}
