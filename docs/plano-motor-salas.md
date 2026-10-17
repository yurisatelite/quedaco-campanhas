# Plano de ação — motor de salas e conteúdo

Esforço de desenvolvimento: Alto, confirmado pela Mestra.

Implementação 0.6.0: etapas locais e fluxo de análise pontual no chat implementados. Verificação automatizada cobre reconhecimento, edição, persistência e aplicação em cenas; a conferência final dos contornos dos mapas reais deve acontecer no mundo da Mestra.

## Fluxo

Contexto da campanha e expectativas → levantamento de todos os mapas → áreas e elementos identificados → confirmação das dúvidas locais → propostas de conteúdo por sala → aprovação individual → vinculação à cena.

## Etapas e critérios de conclusão

1. **Reconhecimento geométrico.** Reaproveitar Regions/Drawings e detectar contornos fechados nas Walls, incluindo portas. Converter coordenadas da cena para a imagem, respeitando padding/offset. Mostrar candidatos sobre o mapa. Não interpretar um contorno como uma sala confirmada automaticamente.
2. **Inventário e lacunas.** Mostrar origem, identificação e campos ainda desconhecidos. Portas secretas só são identificadas como tais quando o Foundry ou a Mestra fornecer essa informação. Objetos de imagem são analisados neste chat e importados; não simular visão local.
3. **Expectativas.** Campos de objetivo/contexto da campanha, intenção por mapa e intenção por área. Uma expectativa orienta a proposta, mas não vira evidência física.
4. **Conjunto de mapas.** Exportar contexto, todas as imagens, áreas e identificações para análise pontual no chat. Aceitar retorno estruturado por mapa e sala. Destinos de stairs vêm de dados confirmados; situações não reconhecidas permanecem em aberto.
5. **Distribuição.** Propostas referenciam IDs estáveis de mapa e sala, independentes da numeração visual e da ordem das cenas. Permitir várias salas numa cena. Cada ameaça, pista, teste, NPC e loot tem revisão própria. Uma dúvida só bloqueia propostas que dependem dela.
6. **Preservação.** Reanálise não duplica áreas nem sobrescreve decisões confirmadas. Elementos aprovados são preservados. Cena existente pode receber conteúdo aprovado de uma área, sem criar uma cena nova por cômodo.
7. **Verificação e entrega.** Testes geométricos, persistência, bloqueios por dependência, referências ao catálogo e UI. Validar mapa 01 e limites em mapas sem Walls. Empacotar e publicar a versão testada com instruções.

## Ferramentas

JavaScript, APIs do Foundry 13, SVG no editor existente, análise visual neste chat, JSON para intercâmbio, catálogo do QUEDAÇO, testes Node e Playwright. Sem novo serviço pago obrigatório. A skill de Foundry orienta os documentos privados e a compatibilidade ApplicationV2.

## Limites explícitos

Sem Walls ou marcações, o motor local não sabe os cômodos de uma imagem arbitrária. Ele informa a lacuna e permite desenho/importação. Não inventar portas, conexões, profundidade de poços, estatísticas ou fichas. Geometria de paredes pode incluir pilares ou contornos externos: confirmar os candidatos antes de distribuir conteúdo.
