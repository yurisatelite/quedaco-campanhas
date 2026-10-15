import { DEFAULT_COVER } from "./data.mjs";
import { escapeHtml } from "./preparation.mjs";
const MODULE = "forien-quest-log";
export function questAPI(game) {
  const module = game.modules.get(MODULE);
  const api = module?.active ? module.public?.QuestAPI : null;
  return typeof api?.DB?.getAllQuests === "function" ? api : null;
}
export function questsForGM(game) {
  if (!game.user?.isGM) return [];
  try {
    return questAPI(game)?.DB.getAllQuests() || [];
  } catch {
    return [];
  }
}
export function linkedQuest(game, scene) {
  return questsForGM(game).find((quest) => quest.id === scene.quest.questId);
}
function requireGM(game) {
  if (!game.user?.isGM)
    throw Error("Somente a Mestra pode atualizar os objetivos da campanha.");
}

export async function createSceneTask(game, scene) {
  requireGM(game);
  const quest = linkedQuest(game, scene);
  if (!quest) throw Error("Selecione uma missão existente.");
  const name = scene.quest.publicObjective.trim();
  if (!name) throw Error("Escreva o objetivo público antes de criar a tarefa.");
  if (
    scene.quest.taskId &&
    quest.tasks.some((task) => task.uuidv4 === scene.quest.taskId)
  )
    throw Error("Esta cena já possui um objetivo vinculado.");
  if (typeof quest.addTask !== "function" || typeof quest.save !== "function")
    throw Error("Esta versão do Forien não permite atualizar tarefas por API.");
  quest.addTask({
    name,
    completed: scene.status === "completed",
    failed: false,
    hidden: false,
  });
  const task = quest.tasks.at(-1);
  if (!task?.uuidv4)
    throw Error("O Forien não retornou o identificador da tarefa.");
  await quest.save();
  return task.uuidv4;
}

export async function syncSceneTask(game, scene, campaign = null) {
  requireGM(game);
  if (!scene.quest.questId || !scene.quest.taskId) return false;
  const quest = linkedQuest(game, scene);
  if (!quest)
    throw Error(
      "A missão vinculada está indisponível; tente sincronizar novamente quando o Forien estiver ativo.",
    );
  const task = quest.tasks.find((task) => task.uuidv4 === scene.quest.taskId);
  if (!task) throw Error("O objetivo vinculado não existe mais na missão.");
  const linkedScenes = campaign?.scenes.filter(
    (entry) =>
      entry.quest.questId === scene.quest.questId &&
      entry.quest.taskId === scene.quest.taskId,
  ) || [scene];
  task.completed = linkedScenes.every((entry) => entry.status === "completed");
  task.failed = false;
  await quest.save();
  return true;
}

export async function publishSceneUpdate(game, scene) {
  requireGM(game);
  const quest = linkedQuest(game, scene);
  if (!quest) throw Error("Selecione uma missão existente.");
  const message = scene.quest.publicUpdate.trim();
  if (!message)
    throw Error("Escreva a informação que deseja publicar para os jogadores.");
  const paragraph = `<p>${escapeHtml(message).replace(/\r?\n/g, "<br>")}</p>`;
  if (!String(quest.description || "").includes(paragraph))
    quest.description = String(quest.description || "") + paragraph;
  await quest.save();
}

export function renderQuestPanel(game, scene, campaign = null) {
  const esc = escapeHtml,
    quests = questsForGM(game),
    quest = linkedQuest(game, scene),
    task = quest?.tasks.find((task) => task.uuidv4 === scene.quest.taskId);
  const image = (entry) =>
    entry.splash || entry.giverData?.img || campaign?.cover || DEFAULT_COVER;
  return `<section class="qc-quest-panel"><h3>Missão dos jogadores</h3><p>Este vínculo é uma preparação privada da Mestra. Escolher uma missão aqui não publica o roteiro, as notas ou os segredos.</p><div class="qc-quest-gallery">${quests.map((entry) => `<button type="button" class="qc-quest-card ${quest?.id === entry.id ? "is-selected" : ""}" data-action="link-quest-card" data-quest="${esc(entry.id)}"><img src="${esc(image(entry))}" alt=""><strong>${esc(entry.name)}</strong><small>${entry.tasks.filter((task) => task.completed && !task.hidden).length} de ${entry.tasks.filter((task) => !task.hidden).length} objetivos</small></button>`).join("")}</div><label class="qc-field">Missão vinculada<select data-action="link-quest"><option value="">Nenhuma</option>${quests.map((entry) => `<option value="${esc(entry.id)}" ${scene.quest.questId === entry.id ? "selected" : ""}>${esc(entry.name)}</option>`).join("")}</select></label>${!questAPI(game) ? '<p class="qc-empty">O registro atual usa o Forien’s Quest Log. Ative-o para consultar as missões.</p>' : ""}${quest ? `<label class="qc-field">Objetivo associado a esta cena<select data-action="link-quest-task"><option value="">Nenhum</option>${quest.tasks.map((task) => `<option value="${esc(task.uuidv4)}" ${task.uuidv4 === scene.quest.taskId ? "selected" : ""}>${esc(task.name)}${task.completed ? " · concluído" : ""}${task.hidden ? " · oculto" : ""}</option>`).join("")}</select></label><button type="button" class="qc-toggle" data-action="toggle-quest-sync" aria-pressed="${scene.quest.syncOnComplete}">${scene.quest.syncOnComplete ? "✓ " : ""}Atualizar este objetivo ao concluir a cena</button><div class="qc-quest-actions"><button data-action="open-quest">Abrir missão / anotações dos jogadores</button><button data-action="sync-quest">Sincronizar progresso agora</button></div>${task ? `<small>Objetivo ${task.completed ? "concluído" : task.failed ? "fracassado" : "em andamento"}${task.hidden ? " · oculto no Forien" : ""}</small>` : ""}${quest.isHidden ? '<p class="qc-empty">A missão está oculta para jogadores no Forien.</p>' : ""}<details class="qc-more"><summary>Criar objetivo ou publicar descoberta</summary><label class="qc-field">Novo objetivo público<input name="public-objective" value="${esc(scene.quest.publicObjective)}"></label><button data-action="create-quest-task">Criar e vincular objetivo público</button><label class="qc-field">Informação já descoberta pelos jogadores<textarea name="public-update" rows="4">${esc(scene.quest.publicUpdate)}</textarea></label><button data-action="publish-quest-update">Publicar informação na missão</button></details>${quest.playernotes ? `<details class="qc-more"><summary>Anotações dos jogadores</summary><pre>${esc(String(quest.playernotes).replace(/<[^>]*>/g, " "))}</pre></details>` : ""}` : ""}</section>`;
}

export function bindQuestRefresh(game, callback, hooks = Hooks) {
  const registered = new Set();
  const bind = () => {
    for (const name of Object.values(questAPI(game)?.DB?.hooks || {}))
      if (typeof name === "string" && !registered.has(name)) {
        registered.add(name);
        hooks.on(name, callback);
      }
  };
  bind();
  hooks.on("ForienQuestLog.Lifecycle.ready", () => {
    bind();
    callback();
  });
}
