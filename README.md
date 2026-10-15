# QUEDAÇO - Campanhas

Administrador independente de campanhas para Foundry VTT 13 e Skyfall RPG, com integração opcional ao Cadastro QUEDAÇO, Forien's Quest Log e FXMaster.

## Instalação

No instalador de módulos do Foundry, use:

```text
https://github.com/yurisatelite/quedaco-campanhas/releases/latest/download/module.json
```

Ative no mundo e abra **Campanhas** na aba Cenas ou no ícone de pergaminho dos controles de tokens. Alternativa:

```js
game.modules.get("quedaco-campanhas").api.open();
```

## Preparação

1. Abra uma campanha nos cartões de **Campanhas salvas e rascunho**, na parte inferior. A aventura inicial chama-se **Uma viagem estranha**, com capa autoral de um anão; o texto privado pode conter spoilers.
2. Escolha a pasta de Cenas do Foundry: a galeria mostra miniaturas, subpastas e o caminho completo. Arquivos de imagem destinados a mapas precisam primeiro existir como Cenas no mundo.
3. Antes de distribuir as cenas, clique em **Planejar** na miniatura. Escolha loot, puzzle, ameaça, desafio complexo, exploração ou segredo e clique na imagem para marcar o ponto. Escreva seu conteúdo; crie uma cena daquele ponto ou vincule à cena atual.
4. O planejamento é uma **leitura visual assistida pela Mestra**, não reconhecimento automático de salas por inteligência artificial. Coordenadas dos pontos são relativas à imagem; eles não posicionam tokens, não adicionam loot automaticamente e não editam o mapa.
5. Use **Usar nesta cena** para associar mapas. A sequência vertical conserva a ordem, inclusive quando uma imagem de narração separa duas cenas do mesmo mapa. As setas alteram a ordem. Cada trecho mostra sua quantidade de cenas.
6. Na aba **Narração e notas**, escolha um tipo predefinido, escreva o texto para narrar e as notas privadas. Para interlúdios, selecione **Imagem para narração**. Abrir a imagem é privado; **Mostrar imagem aos jogadores** é uma ação explícita. A posição dos personagens continua sob seu controle.
7. Em **Monstros e itens**, confira os recursos reconhecidos. Nomes declarados sem ficha oferecem uma seleção e uma área para arrastar Actor/Token ou Item compatível. Substituir a ficha preserva nome, descrição e função da campanha.
8. Nos mapas associados, **Partículas** e **Filtros** abrem os controles visuais do FXMaster instalado. Presets disponíveis podem ser aplicados e guardados por cena, em seus mapas. Reabrir não reinicia um preset já presente, preservando edições. Versões sem API de presets ainda podem oferecer os editores nativos.

Sem mapas é possível criar uma cena genérica e adaptá-la depois. Salas detalhadas permanecem para uma próxima etapa; dados de salas anteriormente cadastrados não são apagados.

### Texto oficial e resolução dos recursos

Importe Markdown ou texto pela biblioteca inferior. O original é preservado em separado e fica bloqueado; edições são feitas na cópia de trabalho. **Salvar cópia de trabalho** atualiza cenas reconhecidas sem apagar notas, mapas ou interlúdios adicionados manualmente.

O catálogo lê atores e itens do mundo, a API pública de NPCs do Cadastro QUEDAÇO e índices de compêndios acessíveis de Skyfall ou sem sistema específico. Não depende de interfaces internas do Cadastro. Se um compêndio estiver indisponível, os demais continuam funcionando.

O reconhecimento é por nomes e UUIDs, não geração de fichas, balanceamento automático ou interpretação semântica por IA. Referências explícitas são a opção mais previsível. Correspondências ambíguas priorizam documentos do mundo; confira os vínculos antes da sessão. No texto livre, quantidades simples e plurais comuns são reconhecidos. Você pode complementar manualmente.

Formato de exemplo:

```markdown
# Minha campanha

## NPCs

### Guia

**Função:** Mostrar a entrada.
Ajuda o grupo, mas não entra na câmara.

## Ameaças

### Sentinela deformada

Protege o receptáculo e reage ao som.

## Itens e loot

### Poção de cura

Uma recompensa na passagem lateral.

## Cenas

### C01 - A câmara

| Campo    | Valor                  |
| -------- | ---------------------- |
| Tipo     | Exploração             |
| NPCs     | Guia                   |
| Ameaças  | 2 Sentinela deformada  |
| Loot     | Poção de cura          |
| Objetivo | Encontrar a inscrição. |

#### Narração

A água ecoa na galeria. Sob a luz das lanternas, vocês distinguem uma inscrição interrompida.

O silêncio é cortado por um ruído de metal. Algo se move além do alcance da luz.
```

As listas de recursos nas tabelas aceitam nomes separados por ponto e vírgula, e quantidade como `2 Nome`. Não use essas seções para mencionar indiscriminadamente criaturas que não participam da cena. Para narrar, prefira parágrafos completos, distinguindo o que os jogadores percebem dos segredos nas notas privadas. A edição não amplia automaticamente um texto curto.

### Tokens e loot

Arraste miniaturas da bandeja ou do roteiro ao mapa. Atores de compêndios podem ser preparados pelo UUID. Loot arrastado cria um **Tile visual oculto** com imagem e quantidade; não entrega itens ao inventário. Revele-o nos controles de Tiles e entregue os itens pelas fichas, quando desejar.

### Missões dos jogadores

A integração usa a API pública do **Forien's Quest Log**, utilizada pelo Cadastro. As missões aparecem com imagem. Atribuir uma missão ou objetivo é um vínculo privado: não publica o roteiro nem as anotações da Mestra.

**Concluir cena e atualizar missão** sincroniza o objetivo escolhido. Um objetivo compartilhado entre cenas só conclui quando todas terminam. As anotações dos jogadores são preservadas. Criação de objetivo e publicação de informação usam somente os campos públicos preenchidos explicitamente. As permissões de visibilidade continuam sob controle do Forien.

O projeto separado QUEDAÇO - Missões ainda não oferece uma API implementada no estado inspecionado. Não há integração direta com uma API inexistente. Sem Forien, a preparação de campanhas continua disponível.

## Privacidade e validação

Campanhas, pontos do planejamento e notas são armazenados em páginas privadas de diário, com permissão padrão NONE. Jogadores não recebem esses dados pela API. Outros GMs têm os privilégios administrativos normais do Foundry. A publicação do módulo não inclui dados do seu mundo.

O pacote inclui texto e capa autorais. Não distribui mapas de terceiros, PDFs ou fichas do livro.

```powershell
npm ci
npm test
npm run package
```

Os testes incluem persistência, permissões simuladas e interface em Edge usando o CSS real do Foundry com documentos simulados. A validação completa de tokens e integrações ainda requer uma sessão real com Skyfall, Forien e FXMaster.
