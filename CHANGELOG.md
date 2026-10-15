# Histórico

## 0.1.0 — Primeira versão instalável

- Biblioteca em cartões com importação de campanhas Markdown/texto e original preservado.
- Noátorá: A Garra Ausente acompanha o módulo, com texto completo, 12 cenas e três perfis narrativos de NPCs. Mapas de terceiros e conteúdo dos livros não são distribuídos.
- Preparação por cena: título, tipo, função narrativa, objetivo, pistas, sucesso, falha, anotações privadas e atribuição de NPCs.
- Campanhas e notas guardadas em páginas de diário com propriedade padrão NONE (0), acessíveis à Mestra. A API não retorna dados de campanha para jogadores. Outros usuários com papel de GM também têm os privilégios normais do Foundry.
- Mapas existentes no mundo são associados sem duplicar arquivos; abertura do mapa e bandeja de atores arrastáveis por cena.
- Roteiro vertical agrupado por mapa, com contagem de cenas, numeração geral e reordenação por setas. Ao abrir um mapa vinculado, o administrador acompanha seu roteiro.
- Texto de narração, ponto de entrada, salas, pistas privadas e conexões. Noátorá inclui sugestões autorais de preparação, que podem ser adaptadas ao mapa vinculado.
- Fichas de monstros e NPCs arrastáveis, inclusive de compêndios. Itens e loot por sala, com quantidades e marcadores visuais de Tile no canvas; os marcadores começam ocultos e podem ser revelados pela Mestra. A entrega ao inventário é manual.
- Objetivos ligados às missões do Forien usadas no Cadastro; conclusão por cena, sincronização de objetivos compartilhados entre várias cenas, consulta às anotações dos jogadores e publicação explícita de informações complementares.
- O projeto separado QUEDAÇO - Missões foi conferido: está no sketch e ainda não possui API implementada. Esta versão integra o registro funcional existente (Forien), sem declarar uma integração inexistente com o projeto futuro.
- A substituição de uma ficha preserva o perfil narrativo e atualiza as referências preparadas desse perfil.
- Integração opcional com a API de presets do FXMaster, detectada conforme a versão instalada. A versão sem essa API permanece utilizável, com os controles de efeitos desabilitados.

### Contrato QUEDAÇO

- ID: `quedaco-campanhas`; `family: quedaco`; `contractVersion: 1`.
- Capabilities: `campaignManager`, `campaignScenes`, `mapAssignments`, `tokenPreparation`, `fxMasterPlans`, `fxMasterPresetControl`, `privateSceneNotes`, `campaignImport`, `mapTimeline`, `roomPreparation`, `lootPreparation`, `questProgress`.
- Métodos: `open()`, `getStatus()` (somente leitura), `listCampaigns()` (resumos para GM, lista vazia para jogadores).
- Registro em `ready`, com emissão de `quedaco:register`.
- Integrações opcionais: QUEDAÇO principal (`npcDatabase`/`listNpcs`), FXMaster (`FXMASTER.api.presets`) e Forien (`public.QuestAPI`).
- Sem QUEDAÇO ou FXMaster: biblioteca, texto, cenas, notas, mapas, atribuição e preparação de atores do mundo continuam funcionando.

### Validação

Nove testes cobrindo importação, persistência, proteção do original, bloqueio de leitura/escrita por jogadores, agrupamento de quatro cenas em um mapa, sincronização de missões sem publicar segredos, objetivos compartilhados e marcadores de loot. Teste de interface em Chromium/Edge com simulação dos documentos do Foundry. O pacote não substitui a validação em uma sessão real de Foundry com Skyfall, Forien e FXMaster.
