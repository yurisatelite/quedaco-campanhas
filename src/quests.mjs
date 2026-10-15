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

export function renderQuestPanel(game, scene) {
  const esc = escapeHtml,
    api = questAPI(game),
    quests = questsForGM(game),
    quest = linkedQuest(game, scene),
    task = quest?.tasks.find((task) => task.uuidv4 === scene.quest.taskId);
  return `<section class="qc-quest-panel"><h3>Missão e progresso dos jogadores</h3><p>${api ? "Conectado à mesma base de missões usada pelo Cadastro (Forien)." : "Ative o Forien’s Quest Log para vincular objetivos. A preparação da campanha continua disponível."}</p><label>Missão<select data-action="link-quest"><option value="">Sem missão vinculada</option>${quests.map((quest) => `<option value="${esc(quest.id)}" ${quest.id === scene.quest.questId ? "selected" : ""}>${esc(quest.name)}</option>`).join("")}</select></label>${scene.quest.questId && !quest ? '<p class="qc-empty">A missão vinculada está indisponível. O vínculo foi preservado.</p>' : ""}${quest ? `<label>Objetivo da missão<select data-action="link-quest-task"><option value="">Sem objetivo vinculado</option>${quest.tasks.map((task) => `<option value="${esc(task.uuidv4)}" ${task.uuidv4 === scene.quest.taskId ? "selected" : ""}>${esc(task.name)}${task.completed ? " · concluído" : ""}${task.hidden ? " · oculto" : ""}</option>`).join("")}</select></label><label>Texto de um novo objetivo público<input name="public-objective" value="${esc(scene.quest.publicObjective)}" placeholder="Ex.: Encontrar a passagem para as galerias"></label><button data-action="create-quest-task">Criar e vincular objetivo público</button><p>${task ? `Progresso no Cadastro: ${task.completed ? "concluído" : task.failed ? "fracassado" : "em andamento"}${task.hidden ? " · tarefa oculta no Forien" : ""}` : "Vincule uma tarefa para sincronizar a conclusão."}${quest.isHidden ? " · A missão está oculta para jogadores: ajuste a visibilidade no Forien." : ""}</p><label class="qc-checkbox"><input type="checkbox" data-action="quest-auto-sync" ${scene.quest.syncOnComplete ? "checked" : ""}>Atualizar o objetivo ao concluir esta cena</label><div class="qc-quest-actions"><button data-action="open-quest">Abrir missão / anotações dos jogadores</button><button data-action="sync-quest">Sincronizar progresso agora</button></div><label>Informação complementar para publicar<textarea name="public-update" rows="3" placeholder="Somente informações já descobertas pelos jogadores">${esc(scene.quest.publicUpdate)}</textarea></label><button data-action="publish-quest-update">Publicar informação na missão</button>${quest.playernotes ? `<details><summary>Anotações dos jogadores nesta missão</summary><pre>${esc(String(quest.playernotes).replace(/<[^>]*>/g, " "))}</pre></details>` : ""}` : ""}<small>As notas privadas, segredos das salas e texto original nunca são enviados à missão automaticamente. Permissões e visibilidade continuam sob o controle do Forien.</small></section>`;
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
