# PecoFence plugins: guide for coding agents

This repository holds community plugins for [PecoFence](https://github.com/DayuanJiang/PecoFence),
a Windows desktop organizer. A plugin is a small tool that lives in a fence on the desktop: a
script that PecoFence runs and whose printed lines it shows as rows, buttons, sliders and pictures.

Read this whole file before you write or change a plugin. It is also the review standard. Every
pull request is checked automatically: two scripted checks (`tools/check.ps1`, `tools/run.ps1`) and
an automatic review by Claude that follows this file (`tools/review.py`). A pull request that passes all three is merged
automatically. Run the two checks yourself before you open the pull request (section 7).

## 1. What a plugin is

One folder `plugins/<id>/` with exactly these files:

| File | What it is |
|---|---|
| `plugin.json` | the manifest (section 3) |
| `main.ps1` | the script PecoFence runs |
| `README.md` | what the plugin does and what it sends over the network, for users |
| `screenshot.png` | optional: one picture of the fence, at most 300 KB |

- `main.ps1` is **Windows PowerShell 5.1** (present on every Windows 10 and 11, so users install
  nothing). Save it as **UTF-8 with BOM**, or 5.1 misreads non-ASCII text. At most 200 KB.
- No other files: no programs, libraries, archives or extra scripts.
- `<id>`: lower-case letters, digits and `-`, 3 to 40 characters, never changed after it is merged.
- A pull request changes one plugin folder and nothing else.

## 2. How a script fence works

The full reference is the *Script fence output* section of
[PecoFence's docs/CLI.md](https://github.com/DayuanJiang/PecoFence/blob/main/docs/CLI.md#script-fence-output).
Read it. The points agents get wrong:

- **Each printed line is a row.** `text | key=value ...` adds parameters after the first `|`
  (`href=`, `open=`, `copy=`, `action=`, `refresh=true`, `color=`, `icon=`, `tooltip=`). `---` is a
  separator. A line starting with `:: ` is a row of cells (buttons, `slider=`, `checkbox=`,
  `image=`, `width=`, `align=`, `fill=`, `under=`) in PecoFence versions that support it.
- **A normal script** runs every `scriptInterval` minutes, for at most 10 seconds, and shows at most
  40 lines. Prefer it when the content changes rarely: it costs nothing between runs.
- **A streaming script** has `# <pecofence.type>streamable</pecofence.type>` in its first 8 KB and keeps
  running. `~~~` starts a new screen. A click on a row with `action=` arrives as one line on standard
  input; read it with a `StreamReader` and `ReadLineAsync()` checked in the loop, as the docs show.
  When the read returns `$null`, the fence is gone: clean up and exit within one second. Between
  updates, sleep; never busy-loop.
- **Environment:** `PECOFENCE_DATA` (this fence's own folder), `PECOFENCE_LANGUAGE` (`en`, `zh-CN`,
  `zh-TW`, `ja`, `ko`, `de`, `fr`, `es`, `pt-BR`, `ru`, `it`), `PECOFENCE_THEME` (`light` / `dark`),
  `PECOFENCE_ACTION`, `PECOFENCE_FENCE`.
- **Text you did not write** (from the network, the clipboard, file names, other programs) must be
  cleaned before printing: replace `|`, `::`, line breaks and quotes, as the docs' `Clean` function
  does. Otherwise it can turn into parameters of a row.
- **Rows that start programs** need `# <pecofence.allow>run</pecofence.allow>` in the first 8 KB and
  `"run": true` in the manifest. Most plugins do not need it; avoid it.
- **Title:** `# <pecofence.title>…</pecofence.title>` names the fence.
- **Language:** show the plugin's texts in `PECOFENCE_LANGUAGE`, English as the fallback; keep them
  in one hashtable at the top of `main.ps1`.

## 3. The manifest, `plugin.json`

```json
{
  "id": "countdown",
  "version": "1.0.0",
  "name": { "en": "Countdown", "zh-CN": "倒数日" },
  "description": { "en": "Days left until the dates you choose.", "zh-CN": "离你选的日子还有几天" },
  "author": "github-login",
  "minPecoFence": "0.4.0",
  "streamable": false,
  "permissions": { "network": [], "clipboard": "none", "files": "data", "run": false }
}
```

- `version` is `x.y.z`. Raise it in every pull request that changes the plugin.
- `author` is the GitHub account that owns the plugin. Only that account can change it later.
- `streamable` must match the header in `main.ps1`.
- `permissions` is a promise that the checks hold the code to. Declare only what you use:
  - `network`: every host name the script connects to (`"api.github.com"`); `[]` for none.
  - `clipboard`: `"none"`, `"read"` or `"readwrite"`.
  - `files`: `"data"` (writes only in `PECOFENCE_DATA`, and `$env:TEMP` for files it deletes again)
    or `"data+read"` (also reads files the user picks; say which in `README.md`).
  - `run`: `true` only when rows start programs (section 2).
- Users see these permissions in plain words before they install.

## 4. Develop and try it on your PC

1. Install PecoFence (`minPecoFence` or later).
2. Make a fence from the script: Settings › 小工具 › 用自己的脚本, or
   `pecofence-cli fence create --script "C:\path\plugins\my-plugin\main.ps1" --title Test`.
3. `pecofence-cli fence get Test` shows the script's `outcome` and `output`;
   `pecofence-cli fence refresh Test` runs it again.
4. Look at it in the light and dark theme, in a narrow (300 px) and a wide fence, in English and
   Chinese.

## 5. Hard rules: safety (one failure and the pull request is not merged)

1. **Readable code only.** Plain PowerShell that a reader can follow. No obfuscated, encoded or
   compressed code, no code assembled at run time and executed, no downloading code or programs to
   run them. Declaring the Windows API functions the plugin's purpose needs is allowed when the
   declaration is written out in `main.ps1`: inline C# with `Add-Type -TypeDefinition`, or
   `DefinePInvokeMethod` on a dynamic assembly, naming the DLL and the function.
2. **Only what the manifest declares:** network hosts, clipboard use, file writes, rows that start
   programs.
3. **Leave the system alone.** No changes to autostart, scheduled tasks, services, firewall,
   security software, system settings or other programs' settings. The registry only under
   `HKCU:\Software\PecoFence-plugins\<id>`. No request for administrator rights. No ending other
   processes. No reading other programs' private data (browser profiles, saved passwords, cookies,
   mail, chat, keys).
4. **Nothing sent in secret.** Send only what the plugin's visible purpose needs, and say in
   `README.md` what is sent and where. Never send the user's files, file names, clipboard, screen,
   keystrokes or computer details unless that is the plugin's stated purpose.
5. **Respect what users mark private.** A plugin that reads the clipboard skips content that password
   managers mark as excluded from clipboard history and monitoring.
6. **Clean untrusted text** before printing it (section 2).
7. **Respect the services you call:** their terms, rate limits and `Retry-After`; a `User-Agent` that
   names the plugin. No API keys in the code; a key the user enters is kept in `PECOFENCE_DATA`.

## 6. Soft rules: performance (measured, shown to users; a fix is asked for past the limits)

`tools/run.ps1` runs the plugin as PecoFence does and measures:

| Measure | Limit |
|---|---|
| CPU at rest, the script and its child processes | under 1 % of one core |
| Memory at rest (private working set) | reported only; Windows PowerShell alone takes about 55 MB |
| Full screens at rest (`~~~`) | at most 1 per second |
| First output after start | within 3 seconds |
| A normal script's run | within 10 seconds |
| Line length | at most 300 characters |

## 7. Self-check before the pull request

On Windows, from a clone of this repository:

```powershell
powershell -NoProfile -File tools\check.ps1 -Plugin plugins\my-plugin   # sections 1, 3 and 5
powershell -NoProfile -File tools\run.ps1   -Plugin plugins\my-plugin   # section 6 and what it really does
```

Both end with `RESULT: PASS`. Paste their last lines into the pull request. Then read your code once
more against section 5: for every network call, clipboard access, file write and program start,
point to the manifest entry that allows it.

## 8. Pull requests

- Title `Add <id>` or `Update <id> to <version>`; the body says what the plugin does or what changed.
- The checks report what fails, and the review requests changes with each broken rule. Fix it and
  push; everything runs again. When everything
  passes, the pull request is merged, and the plugin appears in PecoFence's list within an hour.
- Do not mention the maintainer: nobody reads the pull request unless something is wrong.

## 9. Reports and removal

Report a plugin that breaks these rules with the *Report a plugin* issue form. A plugin found to
break a hard rule is listed in `disabled.json`; it then shows as disabled in the list, and PecoFence
turns it off.
