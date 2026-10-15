export function folderPath(folder, folders) {
  const parts = [],
    seen = new Set();
  let current = folder;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    const parent = current.folder;
    current =
      typeof parent === "string"
        ? folders.find((row) => row.id === parent)
        : parent;
  }
  return parts.join(" › ");
}
export function mapsInFolder(maps, folders, id) {
  if (!id) return [];
  const included = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      const parent =
        typeof folder.folder === "string" ? folder.folder : folder.folder?.id;
      if (included.has(parent) && !included.has(folder.id)) {
        included.add(folder.id);
        changed = true;
      }
    }
  }
  return maps.filter((map) =>
    included.has(typeof map.folder === "string" ? map.folder : map.folder?.id),
  );
}
export const mapImage = (map) =>
  map?.thumb || map?.background?.src || "icons/svg/map.svg";
