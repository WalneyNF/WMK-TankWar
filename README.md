![WMK TankWar — logo oficial](assets/logo.webp)

# 🛡️ WMK TankWar

![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-green)
![HTML5](https://img.shields.io/badge/HTML5-CSS3%20%2B%20JavaScript-orange)
![Status](https://img.shields.io/badge/Status-Em%20desenvolvimento-yellow)

Jogo independente de combate entre blindados, inspirado nas mecânicas de World of Tanks e War Thunder, com identidade própria, interface em português e foco em computadores modestos.

**Autor:** Walney Moreira Klein — walneyk@hotmail.com  
**GitHub:** [WalneyNF](https://github.com/WalneyNF)

## Objetivos

Desenvolver um jogo de blindados extensível, com progressão tecnológica, personalização de veículos, batalhas contra bots e ferramentas para criação de conteúdo.

## Base do protótipo

A versão desenvolvida localmente utiliza HTML, CSS, JavaScript e Canvas 2D, com:

- 20 blindados fictícios em cinco classes: leves, médios, pesados, caça-tanques e AAP.
- Quatro tiers, pesquisa, créditos e experiência.
- Hangar, compra de veículos e melhorias de módulos.
- Combate arcade, mira telescópica e modo de artilharia.
- Progresso salvo no navegador.
- Interface Workspace com painéis móveis, redimensionáveis e layouts personalizáveis, sujeita a testes.

**Estado do repositório:** protótipo v1.5 publicado; validação interativa pendente.

## Como executar

Baixe o projeto pelo botão Code > Download ZIP, extraia os arquivos e abra o index.html no navegador. Alternativamente, utilize o Live Server do VS Code ou o XAMPP.

```bash
git clone https://github.com/WalneyNF/WMK-TankWar.git
```

### Controles do protótipo

| Controle | Ação |
|---|---|
| W/A/S/D | Movimentação |
| Mouse | Apontar |
| Clique / Espaço | Disparar |
| 1 / 2 / 3 | Alternar modo de mira |

## Roadmap

- [x] Publicar o protótipo existente.
- [ ] Validar o protótipo no navegador.
- [ ] Consolidar painéis móveis, fechamento, encaixe, redimensionamento e layouts JSON.
- [ ] Aprimorar hangar e árvore tecnológica por nação, classe e tier.
- [ ] Separar os dados em arquivos JSON individuais por veículo.
- [ ] Criar editor de blindados e laboratório de parâmetros.
- [ ] Implementar hangar 3D com Three.js e modelos GLB.
- [ ] Criar campo de treinamento, editor de mapas e editor de missões.
- [ ] Evoluir bots, equipes, minimapa e modos de jogo.
- [ ] Implementar carreira, estatísticas e progressão avançada.
- [ ] Documentar a arquitetura e publicar versões para testes.

## Contribuições

Sugestões, relatos de erros e melhorias são bem-vindos nas Issues. Informe a versão utilizada, navegador, passos para reproduzir o problema e mensagens do console, quando disponíveis.

## Licença

O código original deste projeto é distribuído sob a [licença MIT](LICENSE). Recursos de terceiros devem respeitar suas respectivas licenças.

World of Tanks e War Thunder são referências de gênero; WMK TankWar não possui vínculo oficial com seus desenvolvedores e não reivindica direitos sobre suas marcas ou recursos.

© 2026 Walney Moreira Klein.

## Documentação HTML

- [Roadmap](roadmap.html)
- [Manual de primeiro contato](manuais/manual.html)
- [Arquitetura e diagnóstico](manuais/arquitetura.html)

## V1.2 — Hangar, pesquisa e treinamento

- Carrossel horizontal com miniaturas vetoriais originais e painel flexível.
- Árvore com cabeçalhos de tiers, conectores e estados de aquisição.
- DEBUG: adicionar/definir créditos e XP, liberar veículos e módulos.
- TREINAMENTO: mapa 2D separado, cinco alvos passivos, obstáculos, reparo e restauração de alvos. Sem recompensas ou contagem de batalhas.
- O layout padrão foi atualizado; a chave antiga de layout foi preservada no navegador, mas não é carregada automaticamente.
- Verificação sintática concluída; teste interativo em navegador pendente.

## V1.3

V1.3 — Equipes 3×3 e 5×5 (incluindo jogador), bots aliados azuis e inimigos vermelhos, minimapa móvel, zoom arcade pela roda do mouse, veículos ampliados, mapa Vale WMK de 3600 × 2400 unidades, efeitos sonoros sintetizados e editor de mapas 2D. Editor permite inserir construções e rochas, remover obstáculos, posicionar cinco spawns por equipe, desfazer, salvar localmente e importar/exportar JSON. Treinos em equipe não alteram economia. Navegação dos bots é heurística local, sem pathfinding global. Catálogo JSON espelhado em catalog.js para abertura offline; ainda não é carregado diretamente do JSON. Testes sintáticos e validação de mapas executados; teste interativo pendente. Recomenda-se Live Server/XAMPP para compartilhar localStorage entre editor e jogo.

[Editor de mapas](editor-mapas.html) · [Mapa exemplo](maps/vale-wmk.json)

## V1.4 — Dificuldade e mapas maiores

V1.4 — Níveis Recruta, Fácil, Normal, Difícil e Elite, com ajuste independente dos aliados e inimigos em 3×3/5×5. Padrão: inimigos Fácil, aliados Normal; batalha solo também inicia com inimigos Fácil. Mapas Vale (3600×2400), Planícies (6000×4000, padrão) e Fronteira (8000×6000), além do mapa personalizado. Recruta reduz resistência, dano, blindagem, penetração, velocidade, alcance e precisão, aumentando a recarga. Os perfis são parâmetros de jogo, não IA externa. Mapas JSON em maps/; referência dos níveis em data/bot-difficulty.json, espelhada no JavaScript. A revanche preserva mapa e níveis. Mapas maiores aumentam o tempo de deslocamento. Sintaxe e validação dos três mapas verificadas; teste de balanceamento em navegador pendente.

## V1.5 — Matchmaker

V1.5 — Blindados com dimensões visuais duplicadas em relação à V1.4; raio de impacto, colisões e posição inicial dos disparos ajustados. Batalhas offline com bots 3×3, 5×5, 10×10 e 15×15. Fila simulada local de cerca de 2,6 segundos, cancelável, seguida da escalação e entrada manual. Nomes fictícios identificados como bots. Matchmaker seleciona veículos do catálogo dentro de ±1 tier do jogador, limitado aos tiers I–IV existentes; espelha quantidade de cada tier e classe e iguala soma dos tiers. Dificuldade pode ser diferente entre equipes e altera a força efetiva. Bots usam atributos do veículo selecionado pelo matchmaker. TAB ou EQUIPES abre escalação com HP e eliminados, pausando o jogo local. Pontos de nascimento extras gerados automaticamente e validados. Testes automatizados: 3200 escalações aprovadas e 12 combinações de mapas e tamanhos de equipes validadas. Teste interativo e desempenho 15×15 ainda pendentes.

## Multiplayer futuro

Multiplayer online futuro: servidor autoritativo para simulação e resultados, autenticação e perfis, lobby e fila real por região/tier, matchmaking de jogadores e bots opcionais claramente identificados, sincronização por WebSocket, interpolação e previsão de movimento, reconexão, persistência de economia no servidor, validação de ações e proteção antitrapaça. Etapas: separar simulação do DOM; protocolo de mensagens e testes de rede; protótipo LAN; servidor online; teste de carga e segurança. Nenhuma conexão multiplayer foi implementada nesta versão.
