# Histórico

## 0.1.0 — Primeira versão instalável

- Biblioteca em cartões com importação de campanhas Markdown/texto e original preservado.
- Noátorá: A Garra Ausente acompanha o módulo, com texto completo, 12 cenas e três perfis narrativos de NPCs. Mapas de terceiros e conteúdo dos livros não são distribuídos.
- Preparação por cena: título, tipo, função narrativa, objetivo, pistas, sucesso, falha, anotações privadas e atribuição de NPCs.
- Campanhas e notas guardadas em páginas de diário com propriedade padrão NONE (0), acessíveis à Mestra. A API não retorna dados de campanha para jogadores. Outros usuários com papel de GM também têm os privilégios normais do Foundry.
- Mapas existentes no mundo são associados sem duplicar arquivos; abertura do mapa e bandeja de atores arrastáveis por cena.
- A substituição de uma ficha preserva o perfil narrativo e atualiza as referências preparadas desse perfil.
- Integração opcional com a API de presets do FXMaster, detectada conforme a versão instalada. A versão sem essa API permanece utilizável, com os controles de efeitos desabilitados.

### Contrato QUEDAÇO

- ID: `quedaco-campanhas`; `family: quedaco`; `contractVersion: 1`.
- Capabilities: `campaignManager`, `campaignScenes`, `mapAssignments`, `tokenPreparation`, `fxMasterPlans`, `fxMasterPresetControl`, `privateSceneNotes`, `campaignImport`.
- Métodos: `open()`, `getStatus()` (somente leitura), `listCampaigns()` (resumos para GM, lista vazia para jogadores).
- Registro em `ready`, com emissão de `quedaco:register`.
- Integrações opcionais: QUEDAÇO principal (`npcDatabase`/`listNpcs`) e FXMaster (`FXMASTER.api.presets`).
- Sem QUEDAÇO ou FXMaster: biblioteca, texto, cenas, notas, mapas, atribuição e preparação de atores do mundo continuam funcionando.

### Validação

Testes de importação, persistência, proteção do original e bloqueio de leitura/escrita por jogadores; teste de interface em Chromium/Edge com simulação dos documentos do Foundry. O pacote não substitui a validação em uma sessão real de Foundry com Skyfall e FXMaster.
