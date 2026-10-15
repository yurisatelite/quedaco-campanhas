# QUEDAÇO - Campanhas — arquitetura do administrador de campanha

## Objetivo da primeira entrega

O módulo administra uma campanha pronta para mestrar. Ele lê os dados de uma campanha estruturada, mostra sua sequência de cenas, associa cada cena a um ou mais mapas do Foundry e prepara uma escala de NPCs e tokens para posicionamento.

O módulo não é dono dos NPCs nem dos mapas. Ele mantém referências para eles e funciona sem o QUEDAÇO principal, embora sua lista de NPCs seja mais completa quando o módulo principal estiver ativo.

## Integrações

| Origem | Consulta | Uso no QUEDAÇO - Campanhas |
| --- | --- | --- |
| QUEDAÇO | `game.modules.get('quedaco').api.listNpcs()` | Catálogo de NPCs já cadastrados, com UUID, nome, imagem, papel e localidade. |
| Foundry VTT | `game.scenes` | Lista de mapas/cenas existentes, imagem de fundo e abertura do mapa. |
| Foundry VTT | `game.folders` com tipo `Scene` | Seleção da pasta que reúne os mapas da campanha. |
| Foundry VTT | `Actor` e `TokenDocument` | Posicionamento manual dos tokens preparados no mapa escolhido. |

O vínculo com `quedaco` é opcional no manifesto. Se ele não estiver ativo, a Mestra ainda poderá vincular Atores do próprio mundo manualmente.

## Dados da campanha

Na versão instalável 0.1.0 os dados ficam em páginas privadas de JournalEntry do próprio módulo, com permissão padrão NONE (0). A configuração de mundo usada no protótipo serve apenas para migração e é esvaziada após a migração. Nenhuma flag, Actor ou Scene de outro módulo é alterada apenas para registrar a campanha. O schema atual é `quedaco-campanhas/v2`, com original preservado, cópia de trabalho e preparação privada por cena; o YAML abaixo registra a proposta inicial.

```yaml
schema: quedaco-campanhas/v1
id: noatora-a-garra-ausente
title: "Noátorá: A Garra Ausente"
mapFolderId: "id-da-pasta-de-cenas-no-foundry"
scenes:
  - id: c09-camara-da-garra
    title: "A câmara da garra ausente"
    kind: desafio
    status: pendente
    mapSceneIds:
      - "id-do-mapa-no-foundry"
    npcRoster:
      - actorUuid: "Actor.id-do-npc"
        quantity: 1
        role: "contato"
        placement: manual
        hidden: false
    tokenRoster:
      - actorUuid: "Actor.id-da-ameaça"
        quantity: 3
        role: "ameaça"
        placement: manual
        hidden: true
    gmNotes: "A garra já foi removida."
```

`mapSceneIds` aceita mais de um mapa porque uma cena narrativa pode passar por áreas ou andares diferentes. `npcRoster` e `tokenRoster` guardam apenas referências e quantidades; criar e mover tokens continuará sendo uma ação explícita da Mestra.

## Tela principal

```text
QUEDAÇO - Campanhas

Campanha: [Noátorá: A Garra Ausente v]
Pasta dos mapas: [Minas de Noátorá v] [Abrir pasta]

01  A memória sem reflexo                  narrativa       sem mapa
02  Corpos de pedra                        criação          Entrada da Mina
03  Permissão para descer                  interação        Entrada da Mina
04  A rota esquecida                       exploração       Subnível 01
...
09  A câmara da garra ausente              desafio          Túneis 02

[Abrir cena] [Editar preparação] [Marcar como atual]
```

Ao abrir uma cena, a Mestra vê:

- objetivo, saída, informações e notas exclusivas da Mestra;
- mapas associados, com botão para abrir cada Scene do Foundry;
- NPCs e ameaças selecionados para a cena;
- quantidade planejada de tokens;
- uma bandeja de preparação para arrastar ou posicionar os tokens no mapa.

## Escolha de mapas

1. A Mestra pode escolher uma pasta existente de Scenes no Foundry.
2. A lista de mapas passa a priorizar as Scenes dessa pasta, mas continua permitindo escolher qualquer mapa do mundo.
3. Cada cena recebe um ou mais mapas associados.
4. O módulo mostra o nome, miniatura e caminho da pasta do mapa escolhido.
5. A Mestra pode abrir o mapa associado sem sair do administrador da campanha.

Esta solução atende tanto quem organiza os mapas em uma pasta específica quanto quem já possui cenas espalhadas pelo mundo.

## Preparação de NPCs e tokens

1. A Mestra abre a cena da campanha.
2. Escolhe NPCs pelo catálogo do QUEDAÇO ou, sem ele, por uma lista de Atores do mundo.
3. Define a função do token: contato, aliado, ameaça, criatura, civil ou marcador.
4. Define quantidade, visibilidade inicial e anotação de uso.
5. Abre o mapa e posiciona os tokens manualmente.

A primeira versão não cria tokens automaticamente em coordenadas inventadas. Ela deixa cada token separado na preparação da cena e torna o posicionamento uma decisão da Mestra. Uma etapa posterior pode oferecer posicionamento em lote, zonas de surgimento e grupos de encontro depois de validarmos o comportamento no Foundry.

## Ordem de implementação

1. Criar o módulo independente `quedaco-campanhas`, com manifesto, API pública e abertura pelo controle de cena.
2. Criar armazenamento de campanhas e carregar a estrutura de `Noátorá: A Garra Ausente`.
3. Construir a tela de cenas e o seletor de pasta/mapas do Foundry.
4. Persistir vínculos entre cenas da campanha e Scenes do Foundry.
5. Integrar o catálogo opcional de NPCs do QUEDAÇO e a seleção manual de Atores como alternativa.
6. Implementar a preparação de tokens por cena.
7. Validar no Foundry a abertura de mapas, a seleção de NPCs e o arraste/posicionamento de tokens.

## Contrato público do novo módulo

```js
capabilities: {
  campaignManager: true,
  campaignScenes: true,
  mapAssignments: true,
  tokenPreparation: true
}
```

Métodos públicos iniciais:

- `open()` abre o administrador de campanhas.
- `getStatus()` informa se o módulo está pronto e se o catálogo de NPCs do QUEDAÇO foi reconhecido.
- `listCampaigns()` devolve apenas id, título e estado das campanhas, sem notas privadas ou conteúdo de mesa.

## Limites da primeira versão

- Não edita NPCs pertencentes ao QUEDAÇO.
- Não cria, move ou apaga mapas para organizar a campanha.
- Não altera tokens existentes sem uma ação explícita da Mestra.
- Não depende do QUEDAÇO para abrir ou armazenar a campanha.
