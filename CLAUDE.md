# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Las instrucciones del proyecto (comandos, arquitectura, publicación y licencias) están en `AGENTS.md`, compartido con otros agentes:

@AGENTS.md

## Específico de Claude Code

- Para verificar la UI, usá Playwright (`npm run e2e`, o un script con `chromium.launch({ channel: 'chrome' })` y `devices['iPhone 13']`), que deja capturas en `e2e/screenshots/`. Las capturas completas con la extensión de Chrome fallaron por timeout en esta máquina; `zoom` sí funciona.
- Las capturas tomadas justo después de una jugada pueden mostrar la animación de chessground a medio camino: no lo confundas con un bug sin esperar unos 300 ms.
- Un push a `main` publica la app de inmediato: confirmá con el usuario antes de cada push.
