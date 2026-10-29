# Plano — FPS 3D mobile "Linha de Frente"

## Objetivo
Substituir o Come-Come em `index.html` por um FPS 3D mobile-first em Three.js, com visual militar realista estilizado, ondas de inimigos com IA, combate com headshot, HUD, controles touch e áudio procedural. Preservar o jogo antigo em `comecome.html`.

## Decisões
- Um único `index.html` autocontido (HTML/CSS/JS inline) + Three.js via CDN `three@0.169` com import map. Sem assets externos: texturas, armas, cenário, inimigos e sons gerados proceduralmente.
- Alvo: navegador mobile (toque) e desktop (mouse/teclado). Suporta retrato e paisagem, com aviso para girar em retrato.
- Modo: sobrevivência por ondas, dificuldade progressiva, pontuação, combo, recorde em `localStorage`.
- Estética: composto industrial ao entardecer, névoa, sombras, PBR, paleta dessaturada com luz quente/fria.

## Etapas
1. **Base e cena**
   - Renderer WebGL com ACES, sRGB, sombras PCFSoft, DPR limitado; resize/orientação.
   - Câmera FPS, névoa, céu gradiente, iluminação solar + hemisférica, pós de partículas.
   - Mapa fechado: piso, perímetro, galpões, contêineres, caixas, barreiras, torre, postes; colisores AABB.
   - Texturas procedurais (concreto, metal, areia, ferrugem) em canvas + UV repetido.

2. **Jogador e controles**
   - Movimento WASD/analógico esquerdo, corrida, agachar, pulo, colisão e limites.
   - Mouse look com pointer lock no desktop; arrastar na metade direita no mobile.
   - Joystick virtual, botões de tiro, mira, recarga, pulo; layout responsivo.
   - Vida, dano, regeneração lenta, feedback de dano.

3. **Arma e combate**
   - Rifle 3D procedural em viewmodel com sway/bob, recuo, ADS, animação de recarga.
   - Hitscan com spread, dano por parte do corpo, headshot, tracer, muzzle flash, faíscas e impactos.
   - Munição, recarga, munição de reserva, pickup de munição/vida.
   - Crosshair dinâmico, hitmarker, números de dano, kill feed.

4. **Inimigos e ondas**
   - Inimigos humanoides blindados com primitivas, animação procedural de caminhada/morte.
   - IA: spawn em pontos fora da visão, perseguição com desvio de obstáculos, ataque à distância, estados.
   - Ondas com contagem crescente, tipos (soldado, rusher, tanque), spawn telegraph, intervalo, bônus.
   - Pontuação, combo, recorde e progressão de dificuldade.

5. **UI/UX**
   - Menu com título, instruções, recorde e botão Jogar.
   - HUD: vida, munição, onda, pontuação, recorde, inimigos restantes.
   - Pausa, game over com estatísticas e reinício.
   - Compatibilidade com seletores do capture (`#game`, `#playBtn`, `#overlay`, `#score`, `#level`, `#lives`, textos "Pontos/Recorde/Nível").

6. **Áudio**
   - WebAudio procedural: tiros, recarga, impactos, hitmarker, passos, alarme de onda, ambiente; mute persistente.

7. **Desempenho**
   - Pooling de projéteis/partículas, materiais compartilhados, sombras reduzidas no mobile, DPR adaptativo, pausa ao perder foco.

8. **Verificação**
   - Servir com `start.sh`; atualizar `capture.mjs` para validar canvas WebGL e gerar screenshots desktop/mobile.
   - Rodar `capture.sh`, revisar screenshots, corrigir erros de console e regressões visuais.
   - Testar fluxo jogar → atirar → ser atingido → recarregar → pausar → game over → reiniciar.
