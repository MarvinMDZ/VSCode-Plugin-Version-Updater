# PRD — Version Updater: Mejoras por Fases

> **Extension:** `MarvinMDZ.version-updater-comment` | **Version actual:** 1.0.0
> **Fecha:** 2026-03-06

---

## Resumen Ejecutivo

Tras un analisis completo del proyecto, se identificaron **6 bugs**, **5 problemas de calidad de codigo**, **4 features incompletas/ausentes**, y **deficiencias severas en cobertura de tests** (solo se testean las 4 funciones puras de `version.ts`). Este PRD organiza las mejoras en 5 fases priorizadas por impacto y riesgo.

---

## Fase 1 — Correccion de Bugs Criticos

**Objetivo:** Estabilizar la extension corrigiendo errores que afectan la funcionalidad correcta.

### 1.1 CRLF line splitting produce rangos incorrectos

- **Archivo:** `src/services/versionScanner.ts:34`
- **Problema:** `text.split('\n')` deja `\r` al final de cada linea en archivos Windows (CRLF), desplazando los rangos de reemplazo.
- **Solucion:** Usar `document.lineAt(i).text` para iterar lineas, o `text.split(/\r?\n/)`.

### 1.2 `autoUpdateOnSave` configurado pero no implementado

- **Archivos:** `src/types/index.ts`, `src/services/versionScanner.ts`, `package.json`
- **Problema:** La configuracion existe en `package.json` contributes y en `ExtensionConfig`, pero no hay ningun listener `onDidSaveTextDocument`. El usuario ve la opcion pero no hace nada.
- **Solucion:** Implementar el listener en `src/extension.ts`, o remover la configuracion hasta que se implemente (ver Fase 4).

### 1.3 Condicion siempre verdadera en seleccion de cursor

- **Archivo:** `src/commands/bumpVersion.ts:29`
- **Problema:** `if (!selection.isEmpty || selection.active)` — `selection.active` siempre es un `Position` (truthy), haciendo la condicion siempre `true`.
- **Solucion:** Cambiar a `if (!selection.isEmpty)` o evaluar `selection.active` dentro de un rango valido.

### 1.4 QuickPick selecciona la primera coincidencia duplicada

- **Archivo:** `src/extension.ts:115` (comando `scanDocument`)
- **Problema:** `matches.find(m => m.version === selected.label)` retorna siempre la primera ocurrencia cuando hay versiones duplicadas.
- **Solucion:** Incluir informacion de linea en el QuickPick (`detail: "Line ${m.line + 1}"`) y usar el indice para identificar el match correcto.

### 1.5 Hover message duplica logica de bump

- **Archivo:** `src/providers/decorationProvider.ts:66-70`
- **Problema:** Usa aritmetica directa (`match.patch + 1`) en vez de llamar a `bumpVersion()`. Si la logica de bump cambia, el hover quedara inconsistente.
- **Solucion:** Importar y usar `bumpVersion` de `src/utils/version.ts` para generar los valores del hover.

---

## Fase 2 — Cobertura de Tests

**Objetivo:** Alcanzar cobertura significativa en los modulos criticos. Actualmente solo `src/utils/version.ts` tiene tests unitarios.

### 2.1 Tests unitarios para `VersionScanner`

- **Archivo nuevo:** `src/test/unit/versionScanner.test.ts`
- **Casos:**
  - Patrones aplicados correctamente a texto con versiones
  - Deduplicacion de matches en la misma linea/posicion
  - Documento vacio retorna `[]`
  - Manejo correcto de CRLF vs LF (post-fix de Fase 1.1)
  - Multiples patrones matchean distintas versiones en la misma linea
  - `refreshConfig` recarga patrones desde configuracion

### 2.2 Tests unitarios para comandos

- **Archivo nuevo:** `src/test/unit/commands.test.ts`
- **Casos para `createBumpVersionCommand`:**
  - Bump en posicion del cursor cuando hay match
  - Fallback a QuickPick cuando no hay match en cursor
  - Mensaje informativo cuando no hay versiones en el archivo
- **Casos para `createBumpAllVersionsCommand`:**
  - Confirmacion modal antes de proceder
  - Ediciones en orden reverso (bottom-to-top)
  - Cancelacion del modal no aplica cambios
- **Casos para `createBumpAtRangeCommand`:**
  - Bump correcto pasando URI y argumentos validos
  - Version invalida en argumentos

### 2.3 Tests unitarios para providers

- **Archivo nuevo:** `src/test/unit/providers.test.ts`
- **Casos para `VersionCodeLensProvider`:**
  - 3 CodeLenses generados por match
  - Respeta `showCodeLens: false`
  - `_onDidChangeCodeLenses` se emite al cambiar config
- **Casos para `VersionDecorationProvider`:**
  - Decoraciones aplicadas cuando `showDecorations: true`
  - Sin decoraciones cuando `showDecorations: false`
  - Hover message muestra bump correcto (post-fix Fase 1.5)
  - `dispose()` limpia listeners y decoration type

### 2.4 Completar tests de `version.ts`

- **Archivo existente:** `src/test/unit/version.test.ts`
- **Casos faltantes:**
  - `bumpVersion` con version prerelease (documentar que se elimina el sufijo)
  - `compareVersions` con prereleases (`1.2.3-alpha` vs `1.2.3`)
  - `parseVersion` con build metadata (`1.2.3+build.1`)

### 2.5 Mejorar tests de integracion

- **Archivo existente:** `src/test/integration/extension.test.ts`
- **Casos a agregar:**
  - Verificar que CodeLenses se generan para versiones detectadas
  - Ejecutar comando de bump y verificar que el texto cambia
  - Verificar que las decoraciones se aplican

---

## Fase 3 — Calidad de Codigo y Performance

**Objetivo:** Optimizar el rendimiento y eliminar code smells.

### 3.1 Cache de RegExp compilados

- **Archivo:** `src/services/versionScanner.ts:40-41`
- **Problema:** `new RegExp(patternString, 'gi')` se crea por cada patron, por cada linea, en cada escaneo.
- **Solucion:** Compilar los patrones una vez en `loadConfig()` / `refreshConfig()` y almacenarlos como `private compiledPatterns: RegExp[]`. Resetear `lastIndex` antes de cada uso.

### 3.2 Cache de resultados de escaneo

- **Archivo:** `src/services/versionScanner.ts`
- **Problema:** `scanDocument` se invoca independientemente desde el CodeLensProvider y el DecorationProvider para el mismo documento y version, duplicando trabajo.
- **Solucion:** Implementar cache por `(document.uri, document.version)` con invalidacion automatica. Ambos providers consumen el mismo resultado.

### 3.3 Centralizar refresh de configuracion

- **Archivos:** `src/providers/codeLensProvider.ts:14`, `src/providers/decorationProvider.ts:27`, `src/extension.ts`
- **Problema:** `scanner.refreshConfig()` se llama desde 3 lugares distintos ante un cambio de configuracion.
- **Solucion:** Que el `VersionScanner` suscriba su propio listener a `onDidChangeConfiguration` internamente. Los providers solo reaccionan re-renderizando, sin re-cargar config.

### 3.4 Eliminar codigo muerto

- **Archivo:** `src/types/index.ts`
- **Accion:** Eliminar `VersionUpdateResult` — interfaz exportada sin ningun consumidor.

### 3.5 Evitar `showTextDocument` innecesario en `bumpAtRange`

- **Archivo:** `src/commands/bumpAtRange.ts:9-10`
- **Solucion:** Verificar si el documento ya es el editor activo antes de llamar `showTextDocument`.

---

## Fase 4 — Features Incompletas y Nuevas

**Objetivo:** Completar funcionalidad prometida y agregar features de alto valor.

### 4.1 Implementar `autoUpdateOnSave`

- **Archivo:** `src/extension.ts` (nuevo listener)
- **Comportamiento:** Al guardar un archivo, escanear versiones y auto-incrementar patch en todas. Debe ser opt-in (`false` por defecto, ya esta asi).
- **Consideraciones:**
  - Usar `onWillSaveTextDocument` para aplicar ediciones antes del guardado
  - Respetar el patron de edicion bottom-to-top
  - Agregar opcion de confirmacion o hacerlo silencioso segun configuracion

### 4.2 Status Bar Item

- **Archivo nuevo:** `src/providers/statusBarProvider.ts`
- **Comportamiento:** Mostrar en la barra de estado la cantidad de versiones detectadas en el archivo activo (ej: `$(versions) 5 versions`).
- **Actualizacion:** Reaccionar a cambio de editor activo y cambios en el documento.

### 4.3 Soporte basico de prerelease en bump

- **Archivos:** `src/utils/version.ts`
- **Problema documentado:** `bumpVersion` siempre elimina el sufijo prerelease.
- **Solucion:** Agregar una opcion para preservar/incrementar el prerelease tag. Ej: `1.2.3-beta.1` + patch = `1.2.4-beta.1` o `1.2.3-beta.2` segun configuracion del usuario.
- **Nueva config:** `versionUpdater.preservePrerelease: boolean` (default `false` para backward compat).

### 4.4 Soporte multi-archivo (workspace scan)

- **Archivo nuevo:** `src/commands/workspaceScan.ts`
- **Comando nuevo:** `versionUpdater.scanWorkspace`
- **Comportamiento:** Escanear todos los archivos del workspace (respetando `.gitignore`), mostrar resultados en un QuickPick agrupado por archivo, permitir navegar al match seleccionado.

### 4.5 CI en branch `develop`

- **Archivo:** `.github/workflows/ci.yml`
- **Problema:** CI solo se ejecuta en push/PR a `main`, pero el branch de desarrollo es `develop`.
- **Solucion:** Agregar `develop` a los triggers de `push` y `pull_request`.

---

## Fase 5 — Polish y Experiencia de Usuario

**Objetivo:** Mejorar la experiencia del usuario y la mantenibilidad a largo plazo.

### 5.1 Sistema de notificaciones configurable

- **Archivo nuevo:** `src/utils/notifications.ts`
- **Basado en:** Patron de la skill `vscode-extension-guide` con `NotificationMode`.
- **Config nueva:** `versionUpdater.notificationMode: "default" | "silent" | "statusBar"`
- **Beneficio:** Los usuarios pueden silenciar las notificaciones de bump sin desactivar la funcionalidad.

### 5.2 Implementar `resolveCodeLens` para rendimiento

- **Archivo:** `src/providers/codeLensProvider.ts`
- **Mejora:** Retornar CodeLenses sin comando en `provideCodeLenses`, y resolver el comando en `resolveCodeLens` bajo demanda. Mejora el rendimiento en archivos con muchas versiones.

### 5.3 Telemetria de uso (opt-in)

- **Consideracion:** Agregar telemetria basica (versiones bumpeadas, comandos usados) usando `@vscode/extension-telemetry` para informar decisiones futuras.
- **Requisito:** Debe respetar `telemetry.telemetryLevel` de VS Code.

### 5.4 Decoracion con colores por tipo de bump

- **Archivo:** `src/providers/decorationProvider.ts`
- **Mejora:** Permitir colores diferentes para major/minor/patch en el hover, o un indicador visual del "age" de la version.

### 5.5 Comando de undo para bump

- **Archivo nuevo:** `src/commands/undoBump.ts`
- **Comportamiento:** Mantener un historial breve de los ultimos bumps realizados y permitir deshacerlos con un comando dedicado (complementario a Ctrl+Z).

---

## Matriz de Prioridad

| Fase  | Items              | Esfuerzo         | Impacto | Riesgo si no se hace       |
| ----- | ------------------ | ---------------- | ------- | -------------------------- |
| **1** | 5 bugs             | Bajo (1-2 dias)  | Alto    | Bugs visibles al usuario   |
| **2** | 5 areas de test    | Medio (2-3 dias) | Alto    | Regresiones silenciosas    |
| **3** | 5 mejoras tecnicas | Medio (1-2 dias) | Medio   | Degradacion de rendimiento |
| **4** | 5 features         | Alto (3-5 dias)  | Alto    | Extension incompleta       |
| **5** | 5 mejoras UX       | Alto (3-5 dias)  | Medio   | Nice-to-have               |

---

## Dependencias entre Fases

```
Fase 1 (Bugs) ──> Fase 2 (Tests) ──> Fase 3 (Quality)
                                  ──> Fase 4 (Features)
                                              │
                                              v
                                      Fase 5 (Polish)
```

- **Fase 2 depende de Fase 1:** Los tests deben validar el comportamiento correcto post-fix.
- **Fase 3 y 4 pueden ejecutarse en paralelo** tras completar Fase 2.
- **Fase 5 depende de Fase 4:** El polish aplica sobre las features ya implementadas.
