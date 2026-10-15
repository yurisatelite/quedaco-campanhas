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
