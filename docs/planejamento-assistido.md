# Planejamento do conjunto de mapas

Na visão geral da campanha, abra **Planejamento do conjunto de mapas · análise e aprovação**.

1. Escreva o objetivo, o conhecimento inicial dos personagens e os segredos da Mestra. Na campanha de Noátorá, o botão de contexto revisado preenche o acordo narrativo mais recente.
2. Escolha a pasta de mapas e informe o caminho da imagem do esquema geral no campo do guia. O exportador inclui todos os mapas da pasta e suas subpastas, o catálogo consultável e as imagens originais disponíveis (usando a miniatura apenas quando não existir imagem de fundo).
3. Exporte o JSON. Ele contém dados privados. Use-o na análise com uma IA que aceite arquivos e imagens; se a IA não conseguir interpretar imagens embutidas em JSON, anexe também os mapas originais.
4. No mapa, abra **Salas → Reconhecer salas e elementos**. O motor procura contornos nas paredes e importa Regions/Drawings. Mostra portas/tokens e ligações Stairways com parceiro encontrado. Confirme, descarte ou redesenhe os candidatos. Se faltarem paredes, ele informa a lacuna; você pode desenhar a área ou importar a análise visual.
5. Preencha **O que espero deste mapa**, **O que espero desta sala** e **O que ainda está em aberto**. Essas instruções seguem junto ao contexto; não são tratadas como fatos identificados.
6. Importe a análise do chat. O campo opcional `maps` recebe áreas percentuais da imagem, observações e dúvidas. Os contornos recebidos continuam como candidatos até sua confirmação.
7. Responda às perguntas de geografia. Perguntas com `mapId`/`areaId` bloqueiam apenas propostas desses espaços; as perguntas sem escopo são globais. Use `dependsOn` para dependências explícitas.
8. Edite a narração e os elementos, aprove/rejeite cada um e aprove a proposta. Escolha criar uma cena ou adicionar a uma cena existente deste mapa. Na segunda opção é obrigatório indicar uma área. Fichas e quantidades podem ser ajustadas no painel.

Nenhuma chamada a um provedor externo é feita pelo módulo nesta etapa. A leitura visual por IA ocorre fora do Foundry; a revisão, os bloqueios e a criação das cenas ocorrem dentro dele. Uma conexão automática dependerá da escolha e configuração do serviço de análise.

Propostas aprovadas ou aplicadas não são substituídas por novas análises. Elementos aprovados também são preservados quando o restante de sua cena ainda está pendente. Edite o elemento no painel para revisá-lo: uma edição local retorna seu estado a pendente.

As cenas são adicionadas sem remover cenas antigas. Várias salas podem compartilhar uma cena. Fichas de Actor e Item são preparadas quando a referência do elemento aprovado corresponde a um UUID do catálogo. Referências textuais de regras são conservadas nas notas privadas; não executam testes automaticamente. No resumo privado de cada cena, **Salas preparadas nesta cena** mostra narrações e orientações por espaço.

Formato mínimo de resposta:

```json
{
  "campaignId": "ID exportado",
  "questions": [],
  "proposals": [{
    "id": "p1",
    "mapId": "ID exportado do mapa, ou vazio para interlúdio",
    "title": "Título da cena",
    "narration": "Texto para narrar",
    "elements": [{
      "id": "e1",
      "kind": "pista",
      "text": "Informação privada de preparação",
      "reference": "UUID ou fonte da regra, quando disponível"
    }]
  }]
}
```

Quando houver dúvidas, use por exemplo `questions: [{"id":"q1","text":"Onde leva este poço?","mapId":"ID do mapa","areaId":"ID da área"}]`. Pode retornar propostas de outros espaços independentes na mesma resposta. Propostas dependentes dessas perguntas são recusadas até haver resposta. Uma resposta de análise deve pertencer à mesma campanha e usar mapas conhecidos.

Para importar áreas visuais, acrescente:

```json
"maps": [{
  "mapId": "ID do mapa exportado",
  "areas": [{
    "id": "sala-estavel",
    "title": "Sala do poço",
    "shape": "rect",
    "vertices": [{"x": 72, "y": 30}, {"x": 94, "y": 43}],
    "observations": "Abertura circular e destroços visíveis",
    "unknowns": ["Profundidade não identificada"],
    "evidence": "Imagem e confirmação da Mestra"
  }]
}]
```

Coordenadas usam porcentagem da imagem original. As propostas podem indicar `areaId: "sala-estavel"` ao importar o mesmo resultado; o módulo resolve o ID interno. Nas análises seguintes, prefira os IDs exportados. `targetSceneId` aponta para uma cena já existente do mesmo mapa. O texto original da campanha é preservado.

O adaptador Stairways lê `scene.stairways` ou o formato `flags.stairways.data`. Só marca uma ligação como resolvida quando encontra um parceiro de mesmo nome no destino configurado. Não altera stairs e não transforma um rótulo numérico em destino. Referência de implementação: https://gitlab.com/SWW13/foundryvtt-stairways/-/blob/main/src/BaseStairway.js.
