# QUEDAÇO - Campanhas

Administrador de campanhas para Foundry VTT 13 e Skyfall RPG. Funciona sozinho e reconhece opcionalmente o cadastro de NPCs do QUEDAÇO principal.

## Instalação

Em **Configuração → Módulos adicionais → Instalar módulo**, cole:

```text
https://github.com/yurisatelite/quedaco-campanhas/releases/latest/download/module.json
```

Ative **QUEDAÇO - Campanhas** no mundo. A Mestra pode abrir pelo botão **Campanhas** na aba de Cenas ou pelo ícone de pergaminho nos controles de tokens. Alternativa por macro:

```js
game.modules.get("quedaco-campanhas").api.open();
```

## Uso

1. Abra um cartão da biblioteca. Noátorá: A Garra Ausente é criada no primeiro uso com o texto completo e 12 cenas.
2. Escolha a pasta de Cenas que contém os mapas da campanha. Os mapas devem existir como Cenas no mundo do Foundry; arquivos de imagem sozinhos precisam ser configurados como Cenas antes.
3. Associe um ou mais mapas a cada cena da aventura.
4. Edite função narrativa, objetivos, pistas e consequências. Escreva em **Minhas anotações privadas** e clique em **Salvar preparação e notas**.
5. Selecione ou arraste uma ficha para cada perfil de NPC. A representação muda e o perfil narrativo é preservado. Marque o NPC na cena e use **Preparar token** para adicionar à bandeja. Arraste a bandeja para o mapa.
6. Em **Material, original e contexto da campanha**, altere a cópia de trabalho e use **Salvar cópia de trabalho**. O original permanece bloqueado.
7. Opcionalmente, informe um preset do FXMaster e use os controles de aplicar/parar. Os controles dependem da API disponível na versão instalada; nesta primeira versão, o efeito usa o primeiro mapa associado à cena.

### Roteiro por mapa, salas e recompensas

O roteiro é apresentado de cima para baixo: cada mapa reúne suas cenas, na ordem da campanha, com uma contagem como **4 de 12 cenas**. As setas permitem reordenar as cenas. Ao abrir um mapa com o administrador aberto, ele seleciona uma cena correspondente; **Abrir mapa e roteiro** começa pela primeira cena desse mapa.

Cada cena possui **Entrada do grupo / posicionamento**, **Texto para narrar**, funções e notas privadas. Use **Adicionar sala** para criar pontos de interesse com descrição, segredos e saídas. A Mestra posiciona os jogadores no canvas; nenhum personagem é movido automaticamente.

Arraste fichas de monstros/NPCs para a bandeja de atores ou escolha um ator do mundo. Prepare itens e loot escolhendo um item do mundo ou arrastando um Item de compêndio. A sala escolhida na bandeja vincula os novos recursos àquele ponto de interesse. Os recursos preparados também aparecem como miniaturas arrastáveis sob a cena no roteiro.

Ao arrastar loot preparado ao canvas, o módulo cria um **Tile visual oculto**, com a imagem do item e sua quantidade registrada. Revele-o pelo controle de Tiles do Foundry quando desejar. Isso não cria um inventário automático: abra a ficha do item ou arraste-o para uma ficha compatível para fazer a entrega manual.

### Registro de Missões

A integração funcional atual usa a mesma API pública do **Forien's Quest Log** que alimenta a aba Quests do Cadastro. Selecione a missão e o objetivo em cada cena. Alternativamente, escreva o texto público e clique em **Criar e vincular objetivo público**. A visibilidade da missão continua respeitando as permissões do Forien.

Use **Concluir cena e atualizar missão** para registrar a conclusão. Se várias cenas apontarem para o mesmo objetivo, ele só conclui quando todas estiverem concluídas. **Sincronizar progresso agora** permite repetir a operação se o módulo de missões estava indisponível. As anotações dos jogadores permanecem no Forien e podem ser consultadas pelo botão de abrir a missão.

**Publicar informação na missão** envia somente o texto escrito no campo público. Notas privadas, segredos de salas e o texto original nunca são publicados automaticamente.

O projeto separado **QUEDAÇO - Missões**, do chat “Mod. Registro de missões”, foi conferido em 15/10/2026: está no esboço visual e no documento de requisitos, sem módulo/API implementados. A integração direta com esse projeto depende de sua implementação futura. Campanhas já funciona com o registro existente e funciona sem módulo de missões, mantendo a preparação local.

Use **Adicionar campanha** para importar Markdown ou texto. Cabeçalhos `### C01 - Nome da cena` e tabelas com os campos `Tipo`, `Objetivo`, `Ação central`, `Papel`, `Informação`, `Sucesso`, `Falha` e `Saída` são reconhecidos. O arquivo de Noátorá em `campanhas/` serve de referência. Outros textos podem ser importados integralmente e receber cenas pelo botão **Adicionar cena**.

## Privacidade e dados

As campanhas são guardadas no mundo em páginas privadas de diário com permissão padrão NONE, não em flags públicas de mapas ou atores. Jogadores não acessam a interface nem recebem campanhas pela API. Usuários com papel de Mestra/GM mantêm os privilégios administrativos normais do Foundry. O módulo não publica anotações pessoais no GitHub.

O pacote contém o texto autoral da aventura. Não contém os mapas de terceiros, PDFs, fichas ou imagens do livro. As atribuições de mapas e atores são feitas no seu mundo.

## Integrações e validação

O contrato QUEDAÇO está descrito no [histórico](CHANGELOG.md). A integração de efeitos usa a [API oficial do FXMaster](https://github.com/gambit07/fxmaster#developer-api). A presença do FXMaster não garante que versões antigas tenham a API de presets; o módulo detecta isso sem bloquear a campanha.

```powershell
npm ci
npm test
npm run package
```

Os testes incluem navegação e persistência em navegador com documentos simulados. A compatibilidade final de tokens, permissões e efeitos deve ser conferida em uma sessão real do Foundry.
