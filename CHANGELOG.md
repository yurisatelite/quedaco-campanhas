# Histórico

## 0.6.0 — Motor de salas, expectativas e conteúdo por área

- Reconhecimento local de contornos fechados nas Walls, com divisões por portas e interseções; candidatos aguardam confirmação. Não interpreta objetos desenhados apenas na imagem.
- Inventário de portas, portas secretas, estados das fechaduras, tokens e parceiros Stairways. Destinos não resolvidos ficam em aberto.
- Importação de Regions e Drawings com padding/offset, formas curvas e rotações.
- Expectativas por campanha, mapa e área, exportadas com contexto; campos separados para observações e dúvidas ainda desconhecidas.
- Confirmação, descarte e redesenho de contornos mantendo IDs e conteúdo. Reanálises preservam correções.
- Importação de contornos e observações da análise visual feita no chat, com validação de mapas, formas e coordenadas.
- Perguntas por mapa/sala bloqueiam apenas conteúdo dependente. Perguntas globais conservam bloqueio geral.
- Conteúdo aprovado de várias salas pode ser adicionado à mesma cena. Fichas/itens aprovados aceitam referência do catálogo e quantidade.
- Salas preparadas aparecem no resumo privado da cena. Referências de regras ausentes continuam exigindo revisão.
- Plano de ação e instruções do fluxo incluídos em docs/; compatibilidade mantida com Foundry 13.

## 0.5.0 — Planejamento e aprovação do conjunto de mapas

- Painel privado na visão da campanha para objetivo, guia e respostas de geografia.
- Exportação do texto, imagens dos mapas da pasta, esquema geral, catálogo e revisões em JSON; nenhuma chamada externa é feita automaticamente.
- Importação das perguntas antes das propostas, com bloqueio enquanto houver respostas pendentes.
- Aprovação/rejeição de cada cena e elemento; edição local retorna a parte alterada a pendente.
- Propostas e elementos aprovados são preservados em novas análises.
- Cenas aprovadas são adicionadas aos mapas, com referências de Actor/Item preparadas quando disponíveis no catálogo.
- Contexto revisado de Noátorá disponível por botão: desconhecimento inicial da garra, quatro exploradores, fendas temporais e sinais comparáveis no presente.
- Leitura visual automática por serviço de IA ainda depende de integração/configuração; o fluxo desta versão usa troca de arquivos.

## 0.4.0 — Seleção de campanha, quadro de mapas e biblioteca de cenas

- Nova primeira tela **Selecionar campanha**: campanhas empilhadas, cada uma com capa, nome, data (era · ano), descrição curta e contagens.
- **Nova campanha** direto na seleção: nome, data, era, descrição e texto (colado ou importado de .md/.txt). Sem texto, nasce vazia para preencher depois.
- Topo da campanha agora mostra **somente os mapas**, em grade que quebra linha (sem rolagem lateral nem conteúdo vazando dos cartões). Cada mapa mostra a miniatura com as salas desenhadas e numeradas, as cenas já atribuídas e os botões Abrir, Salas e + Cena.
- Cenas saíram do topo: ficam na **biblioteca**, abaixo da galeria de mapas, separadas em *Sem mapa*, *Interlúdios com imagem* e *Já nos mapas*, com ↑/↓ para a ordem.
- **Arrastar uma cena** da biblioteca para um mapa do quadro atribui; arrastar de volta para a biblioteca retira o mapa.
- O painel **Cena NN · uso da Mestra** só aparece ao clicar numa cena. Sem cena escolhida, o painel mostra a **visão da campanha**: NPCs, ameaças, itens, tokens preparados (com as cenas onde aparecem) e o texto da campanha formatado. “← Visão da campanha” e “← Campanhas” voltam.
- Dados e texto da campanha (nome, ano, era, regiões, descrição, capa, cópia de trabalho, original) passaram para “Editar dados e texto da campanha” na visão da campanha.
- A janela rola na vertical; a área de trabalho mantém altura mínima de 560px.
- Campanha ganha o campo `description`; a aventura inicial recebe uma descrição sem spoiler.

## 0.3.0 — Salas desenháveis e memória local

- Planejamento por ponto, retângulo ou polígono diretamente sobre a imagem do mapa.
- Retângulo visível durante o arraste, numeração centralizada e preservação da rolagem após concluir o desenho.
- Importação opcional de Regions e Drawings já existentes na Scene, sem alegar análise automática dos pixels.
- Linha do tempo horizontal: mapas como contêineres, cenas dentro deles e pendências separadas; cores distinguem mapa, cena e ação.
- Uma cena mapeada possui no máximo um mapa; a atribuição move ou remove por alternância, corrigindo o acúmulo de mapas na primeira cena.
- Galeria em árvore com subpastas recolhidas, miniaturas e busca; resumo por cena de loot, puzzles, armadilhas, monstros, desafios e segredos.
- Painel FXMaster por cena com acesso direto aos controles atuais de partículas e filtros.
- Ficha de área com nome, função, ambiente, descrição visual e notas privadas.
- Propostas editáveis de função narrativa, texto para narrar, desafio, ameaças, loot e segredo.
- Regras temáticas combinam o tipo de sala, o ambiente e termos reconhecidos no texto oficial da campanha.
- Aceitar ou rejeitar registra exemplos privados; áreas semelhantes podem reutilizar conteúdo aceito anteriormente.
- Exportação auditável do aprendizado local em JSON; nenhum texto ou mapa é enviado a serviço externo.
- Criação de uma cena por sala ou geração em lote das salas aceitas, com vínculo persistente entre cena, mapa e área.
- Atalho **Planejar salas do mapa atual** nos controles do canvas e método público `openPlanner(mapId)`.
- Migração automática dos pontos da 0.2 para áreas pontuais e schema privado v3, preservando cenas e anotações.
- Capabilities novas: `roomAreaDrawing` e `localCampaignLearning`.
- Dezessete testes automatizados cobrindo migração, sugestões, memória, desenho, Regions/Drawings e geração de cenas.

## 0.2.0 — Preparação visual e recursos declarados

- Interface refeita: campos compactos, tipos predefinidos, narração ampliada, cartões e rascunho na parte inferior e marcação única por botão.
- Nome inicial sem spoiler, Uma viagem estranha, com capa autoral e seleção de imagem por campanha.
- Pasta de mapas com caminho completo, subpastas, busca, miniaturas e abertura por cena.
- Cenas de imagem para narração entre mapas, sem quebrar a ordem do roteiro.
- Planejamento visual privado por mapa: pontos de loot, puzzles, ameaças, desafios complexos, exploração e segredos; criação e vinculação de cenas. A marcação é assistida, não detecção automática de salas.
- Reconhecimento de recursos em texto, NPCs/ameaças/itens declarados e vínculos pendentes por nome. Seleção ou arraste de representação preserva a informação narrativa.
- Consulta a atores, itens, compêndios e API pública de NPCs; quantidades, bandejas e exclusões manuais preservadas.
- FXMaster por mapa: atalhos aos editores de partículas/filtros, aplicação de presets e preservação das edições ao reabrir.
- Missões com imagens e vínculos privados; somente ações públicas explícitas atualizam o registro dos jogadores.
- Importação de narração em parágrafos e referências de recursos por cena; atualização mantém notas, atribuições e interlúdios.
- Salas detalhadas retiradas da interface nesta fase, preservando dados existentes.
- Capabilities novas: imageNarration, automaticResourceLinks, visualMapLibrary, mapPlanning e declaredResources. roomPreparation deixa de ser anunciada nesta versão.
- Quinze testes automatizados, incluindo interface com CSS real do Foundry e documentos simulados. Sessão real ainda necessária para validar todas as integrações.

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
