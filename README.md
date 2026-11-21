# 🌈 Aventura dos Sonhos — Ben & Liz

Jogo de navegação aérea 2D de rolagem lateral, inspirado na estrutura dos clássicos *shoot 'em up*, com tema infantil e **uma única fase**.

## Como jogar

Abra `index.html` no navegador, selecione **Ben** (dragão) ou **Liz** (unicórnio), escolha **Fácil**, **Normal** ou **Difícil** e pressione **Começar a aventura**. O jogo é para **1 jogador por vez**.

- **Setas ou WASD:** movimentar.
- **Tiro normal:** automático para facilitar a brincadeira; Espaço também ativa a cadência rápida.
- **X ou Shift:** ataque especial quando a barra estiver cheia.
- **P:** pausar ou continuar. **Escape:** pausa quando não está em tela cheia (no modo tela cheia, Escape sai dela).
- **F ou botão ⛶ Tela cheia:** alternar a exibição em tela cheia quando o navegador permitir. O jogo mantém o formato 16:9.
- **Celular/tablet:** arraste o dedo na área do jogo; botões de tiro e especial no canto inferior direito. Prefira a orientação horizontal.
- **Som:** botão abaixo do jogo. A música só começa depois de o jogador tocar em **Começar**, respeitando as restrições dos navegadores.

## Heróis

- **Ben:** lança fogo do dragão; especial com **três meteoros flamejantes**.
- **Liz:** dispara raios coloridos do chifre; especial com **bomba explosiva de cores**.

Cada herói começa com **3 vidas** e **100 pontos de energia por vida**. A energia é recuperada ao avançar de onda e por corações coletáveis. Há invulnerabilidade temporária após receber dano.

## Estrutura

1. **Nuvens sonolentas** — inimigos fofinhos e leves.
2. **Brilhos travessos** — surgem mais adversários e tiros direcionados.
3. **A dança dos docinhos** — ritmo mais movimentado.
4. **O céu das estrelinhas** — aumenta a variedade de adversários.
5. **A última tempestade** — última onda aérea.
6. **Barão Algodão-Cetro** — luta em três fases: bolhas sonolentas e vento de doces; raio espiral e chuva de doces; investida e escudo rotativo. O cristal no peito é o alvo.

**Duração de referência:** cinco ondas de 22–26 segundos (conforme a dificuldade) mais o chefão (mínimo de 48 segundos), total típico visado de aproximadamente **3 minutos**, variando com o desempenho. Não é uma garantia cronométrica.

## Colocar no GitHub Pages

1. Crie um repositório **público** no GitHub, por exemplo `aventura-dos-sonhos`.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório: `index.html`, `style.css`, `game.js`, `assets/` e `.nojekyll`.
3. Vá a **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Selecione a branch **main** e a pasta **/(root)**, depois **Save**.
5. Aguarde a publicação do GitHub Pages. O endereço costuma seguir o padrão `https://SEU-USUARIO.github.io/aventura-dos-sonhos/`.

Não há servidor, banco de dados, biblioteca de terceiros ou processo de instalação. Os arquivos podem ser testados em qualquer servidor HTTP local, como `python -m http.server 8000`.

## Arquivos

- `index.html` — menus, seleção de personagens e interface.
- `style.css` — estilo responsivo.
- `game.js` — simulação, mecânicas, animação, música e efeitos sonoros originais via Web Audio API.
- `assets/ben*.png`, `assets/liz*.png`, `assets/boss*.png` — recortes com transparência a partir das artes de referência fornecidas pelo criador do projeto.
- `assets/favicon.svg` — ícone vetorial.

**Privacidade:** jogo offline após carregamento, sem anúncios, sem coleta de dados, sem chamadas a APIs externas e sem login. Projeto feito para diversão da família.

## Como personalizar

Ajuste `diffSettings` no início de `game.js` para mudar duração das ondas, pontos de vida do chefão, frequência de inimigos e dificuldade. As artes estão em `assets/` em PNG com transparência. O jogo usa coordenadas lógicas de 1280 × 720, ajustadas à tela pelo navegador.

## Atualização 1.1 — duração, vidas e tela cheia

- Corrigida uma condição de erro ao perder vida: os tiros próximos agora são sinalizados e removidos com segurança durante o loop, sem interromper a animação. Ao perder a última vida, aparece a opção **Jogar novamente** ou **Menu**.
- Corrigida também a interrupção do loop na vitória quando havia vários projéteis ativos.
- Cinco ondas mais curtas (22–26 s cada), chefão com três fases mais rápidas, resistência recalibrada. Duração-alvo aproximada de 3 min; pode variar conforme a habilidade de quem joga.
- Botão **⛶ Tela cheia** sempre disponível, inclusive no menu e nas telas de pausa e derrota. Atalho **F** em computadores. **Escape** sai da tela cheia conforme o navegador.
