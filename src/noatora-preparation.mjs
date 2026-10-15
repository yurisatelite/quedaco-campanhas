/** Material de preparação autoral e editável. Os mapas e fichas são vinculados pela Mestra. */
export function prepareNoatora(campaign) {
  const proposals = [
    [
      "Fora do mapa; transição pela memória.",
      "O reflexo de vocês chega à superfície antes dos seus corpos. A água se dobra para cima. Uma mão imensa tenta agarrar o céu, mas falta-lhe uma garra. Quando a pedra começa a respirar, vocês caem para dentro dela.",
    ],
    [
      "Posicione os corpos tôras juntos, em uma área segura da entrada.",
      "O peso do corpo mudou. Os dedos são curtos, a pele conhece a poeira da mina e uma voz chama por um nome que não é o seu. Sob os pés, a cidade continua trabalhando. Vocês sabem que já estiveram aqui — embora nunca tenham visto este lugar.",
    ],
    [
      "Perto do posto de controle escolhido no mapa de entrada.",
      "O ruído dos trabalhos morre diante de uma passagem vigiada. Um responsável pelas galerias confere marcas em uma tabuleta. Ao ouvir a palavra “contenção”, ele levanta os olhos e baixa a voz.",
      "Posto de acesso",
      "O responsável protege a rota das galerias interditadas. Uma mesa, ferramenta ou marca no piso pode servir de referência de posicionamento.",
      "Defina um capataz, arquivista ou guarda. Ele conhece a existência de uma ala omitida nos mapas comuns; não conhece o roubo temporal.",
    ],
    [
      "Na primeira bifurcação da rota de descida.",
      "Trilhos mergulham na escuridão. O som de água vem de baixo, mas o ar que sobe é quente. Há marcas recentes sobre uma construção muito mais antiga.",
      "Bifurcação dos trilhos",
      "Uma rota conserva os trilhos; outra acompanha a água e desaparece em um trecho de baixa visibilidade.",
      "Apresente duas rotas com custo diferente. As marcas de reconstrução indicam uma instalação de contenção.",
    ],
    [
      "Antes do selo; mantenha espaço para o grupo inspecionar a passagem.",
      "As juntas da pedra brilham como metal recém-forjado. O selo pulsa em intervalos irregulares, e cada pulso produz um estalo dentro da parede.",
      "Passagem selada",
      "Uma estrutura de contenção bloqueia a descida. Rachaduras deixam passar ar quente e um ruído baixo.",
      "A violação segue de dentro para fora. Falhar deve cobrar recursos ou tornar a fuga pior, sem bloquear a pista principal.",
    ],
    [
      "Na transição entre instalações construídas e cavernas naturais.",
      "Os túneis já não obedecem às linhas dos construtores. Cristais e água devolvem ecos que parecem atrasados. Em alguns pontos a rocha guarda o desenho de algo que foi arrancado.",
      "Galeria da ressonância",
      "A água, os cristais e os minerais apresentam alterações próximas ao antigo trajeto da garra.",
      "Sugestão de descoberta: amostra mineral ou registro de contenção. Vincule uma ficha de Item se quiser materializar a pista como loot.",
    ],
    [
      "À entrada da câmara da criatura, antes de revelar o token.",
      "Uma respiração pesada vem da escuridão. O primeiro brilho não é uma tocha: algo vivo expele uma língua de fogo, curta e dolorosa, e se retrai como se o próprio corpo não suportasse aquilo.",
      "Covil da criatura deformada",
      "O terreno oferece cobertura e uma passagem que a criatura pode bloquear ou abandonar.",
      "Arraste a ficha do monstro escolhido para a bandeja desta cena. A criatura pode ser evitada, atraída ou contida; o combate é uma possibilidade. Ajuste o encontro ao nível 3 ou 4 antes da sessão.",
    ],
    [
      "Em uma passagem de encontro breve, sem bloquear a rota da garra.",
      "Um tôra surge entre poeira e vapor. Ele aperta as mãos como se ainda segurasse alguma coisa quente. “Não desçam por aí”, diz; mas seus olhos já procuram um caminho ainda mais fundo.",
    ],
    [
      "Fora do alcance imediato das defesas do receptáculo.",
      "A câmara foi construída ao redor de um espaço grande demais para um tesouro comum. As amarras estão abertas. O lugar onde a garra deveria repousar está vazio — e a ausência parece mais pesada que a pedra.",
      "Receptáculo vazio",
      "O centro da sala conserva encaixes e mecanismos de contenção. Há sinais de retirada e resíduos que podem ser comparados no presente.",
      "Pista obrigatória: a garra esteve aqui e foi removida antes do grupo. Preserve essa conclusão mesmo na falha; cobre perda de evidência secundária, recursos ou uma rota de fuga.",
    ],
    [
      "Em uma área com linha de fuga definida.",
      "O chão dá um salto. Um calor impossível atravessa as galerias, seguido por um som que vocês sentem no peito antes de ouvir. Algo vermelho se move além das paredes, e a cidade inteira parece prender a respiração.",
    ],
    [
      "Na saída da câmara, com ao menos duas rotas de retirada apresentadas.",
      "Uma viga cede atrás de vocês. A água muda de direção e traz destroços. Mais adiante, alguém pede ajuda. O caminho rápido ainda está aberto; o caminho seguro já não existe.",
      "Cruzamento da retirada",
      "Uma rota permite avançar depressa. Outra atravessa o ponto onde há civis ou registros recuperáveis.",
      "Mostre os custos antes da decisão. A pista principal pode sobreviver ao fracasso; ferimentos, perdas e resgates dão peso à escolha.",
    ],
    [
      "De volta aos corpos originais, fora da memória.",
      "A primeira respiração dói. Suas mãos voltaram a ser as suas, mas por um instante ainda carregam poeira de outra época. A câmara estava vazia. Agora vocês sabem reconhecer aquilo que alguém tentou apagar.",
    ],
  ];
  campaign.scenes.forEach((scene, index) => {
    const [entryPoint, narration, name, description, notes] =
      proposals[index] || [];
    scene.entryPoint = entryPoint || "";
    scene.narration = narration || "";
    if (name)
      scene.rooms = [
        {
          id: `noatora-room-${index + 1}`,
          name,
          description,
          notes,
          connections: "Definir após vincular o mapa da cena.",
        },
      ];
  });
  return campaign;
}
