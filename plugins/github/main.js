// GitHub: the newest open issues, open pull requests and commits of the repository in this fence's
// setting "repo" (owner/name). The settings "issues", "pulls" and "commits" choose which of the
// three lists show, "branch" the branch of the commits (empty: the repository's default branch),
// "rows" how many rows each list shows.
// A click on a row opens it in the browser, a click on a list's title opens that page of the
// repository. It asks GitHub without signing in, which allows 60 requests an hour from one network
// address: one request for each list shown, once every 10 minutes while the fence shows, and when
// GitHub says to wait (Retry-After, or the reset time of its limit; a 403 or 429 without either,
// 10 minutes), it waits that long, clicks included. After a settings change it asks 2 seconds
// later, once the changes stopped.

const DEFAULT_ROWS = 5; // rows of each list when the setting "rows" is not a number
const MAX_ROWS = 20; // a pull request weighs about 20 KB: 20 stay far below the 1 MB of an answer
const KINDS = ["issues", "pulls", "commits"];
const ICONS = { issues: "🟢", pulls: "🔀", commits: "📝" };
const EMPTY = { issues: "noIssues", pulls: "noPulls", commits: "noCommits" }; // the text of an empty list
const TEXTS = {
  en: { updated: "Updated at {0}, click to refresh", loading: "Asking GitHub…",
        failed: "No answer from GitHub, trying again at {0}", limited: "GitHub asks to wait, trying again at {0}",
        missing: "GitHub has no public repository {0}", nobranch: "GitHub has no branch {0} in {1}",
        bad: "Write the repository as owner/name in the fence menu, Plugin settings",
        nothing: "Turn on issues, pull requests or commits in the fence menu, Plugin settings",
        issues: "Open issues", pulls: "Open pull requests", commits: "Latest commits",
        noIssues: "No open issues", noPulls: "No open pull requests", noCommits: "No commits",
        tip: "{0}, {1}" },
  "zh-CN": { updated: "{0} 更新，点一下刷新", loading: "正在询问 GitHub…",
             failed: "GitHub 没有回应，{0} 再试", limited: "GitHub 要求等一等，{0} 再试",
             missing: "GitHub 上没有公开的仓库 {0}", nobranch: "GitHub 上 {1} 里没有分支 {0}",
             bad: "请在栅栏菜单的「插件设置」里把仓库写成 owner/name",
             nothing: "请在栅栏菜单的「插件设置」里打开 issue、PR 或提交",
             issues: "未关闭的 issue", pulls: "未关闭的 PR", commits: "最新提交",
             noIssues: "没有未关闭的 issue", noPulls: "没有未关闭的 PR", noCommits: "没有提交",
             tip: "{0}，{1}" },
  "zh-TW": { updated: "{0} 更新，點一下重新整理", loading: "正在詢問 GitHub…",
             failed: "GitHub 沒有回應，{0} 再試", limited: "GitHub 要求等一等，{0} 再試",
             missing: "GitHub 上沒有公開的存放庫 {0}", nobranch: "GitHub 上 {1} 裡沒有分支 {0}",
             bad: "請在圍欄選單的「外掛設定」裡把存放庫寫成 owner/name",
             nothing: "請在圍欄選單的「外掛設定」裡開啟 issue、PR 或提交",
             issues: "未關閉的 issue", pulls: "未關閉的 PR", commits: "最新提交",
             noIssues: "沒有未關閉的 issue", noPulls: "沒有未關閉的 PR", noCommits: "沒有提交",
             tip: "{0}，{1}" },
  ja: { updated: "{0} に更新、クリックで再取得", loading: "GitHub に問い合わせています…",
        failed: "GitHub から応答がありません。{0} にもう一度試します",
        limited: "GitHub から待つように言われました。{0} にもう一度試します",
        missing: "GitHub に公開リポジトリ {0} がありません", nobranch: "GitHub の {1} にブランチ {0} がありません",
        bad: "フェンスのメニューの「プラグインの設定」で、リポジトリを owner/name の形で書いてください",
        nothing: "フェンスのメニューの「プラグインの設定」で、Issue、プル リクエスト、コミットのいずれかをオンにしてください",
        issues: "未解決の Issue", pulls: "未解決のプル リクエスト", commits: "最新のコミット",
        noIssues: "未解決の Issue はありません", noPulls: "未解決のプル リクエストはありません",
        noCommits: "コミットはありません", tip: "{0}、{1}" },
  ko: { updated: "{0} 업데이트, 클릭하면 새로 고침", loading: "GitHub에 묻는 중…",
        failed: "GitHub에서 응답이 없습니다. {0}에 다시 시도합니다",
        limited: "GitHub이 기다리라고 합니다. {0}에 다시 시도합니다",
        missing: "GitHub에 공개 저장소 {0}이(가) 없습니다", nobranch: "GitHub의 {1}에 브랜치 {0}이(가) 없습니다",
        bad: "펜스 메뉴의 '플러그인 설정'에서 저장소를 owner/name 형식으로 쓰세요",
        nothing: "펜스 메뉴의 '플러그인 설정'에서 이슈, 풀 리퀘스트 또는 커밋을 켜세요",
        issues: "열린 이슈", pulls: "열린 풀 리퀘스트", commits: "최근 커밋",
        noIssues: "열린 이슈가 없습니다", noPulls: "열린 풀 리퀘스트가 없습니다", noCommits: "커밋이 없습니다",
        tip: "{0}, {1}" },
  de: { updated: "Stand {0}, zum Aktualisieren klicken", loading: "GitHub wird gefragt…",
        failed: "Keine Antwort von GitHub, neuer Versuch um {0}", limited: "GitHub bittet zu warten, neuer Versuch um {0}",
        missing: "GitHub hat kein öffentliches Repository {0}", nobranch: "GitHub hat keinen Branch {0} in {1}",
        bad: "Schreiben Sie das Repository als owner/name ins Bereichsmenü unter Plugin-Einstellungen",
        nothing: "Schalten Sie im Bereichsmenü unter Plugin-Einstellungen Issues, Pull Requests oder Commits ein",
        issues: "Offene Issues", pulls: "Offene Pull Requests", commits: "Neueste Commits",
        noIssues: "Keine offenen Issues", noPulls: "Keine offenen Pull Requests", noCommits: "Keine Commits",
        tip: "{0}, {1}" },
  fr: { updated: "Mis à jour à {0}, cliquez pour actualiser", loading: "Interrogation de GitHub…",
        failed: "Pas de réponse de GitHub, nouvel essai à {0}", limited: "GitHub demande d'attendre, nouvel essai à {0}",
        missing: "GitHub n'a pas de dépôt public {0}", nobranch: "GitHub n'a pas de branche {0} dans {1}",
        bad: "Écrivez le dépôt sous la forme owner/name dans le menu du groupe, Réglages du plugin",
        nothing: "Activez les issues, les pull requests ou les commits dans le menu du groupe, Réglages du plugin",
        issues: "Issues ouvertes", pulls: "Pull requests ouvertes", commits: "Derniers commits",
        noIssues: "Aucune issue ouverte", noPulls: "Aucune pull request ouverte", noCommits: "Aucun commit",
        tip: "{0}, {1}" },
  es: { updated: "Actualizado a las {0}, haga clic para actualizar", loading: "Consultando GitHub…",
        failed: "GitHub no responde, se vuelve a intentar a las {0}",
        limited: "GitHub pide esperar, se vuelve a intentar a las {0}",
        missing: "GitHub no tiene un repositorio público {0}", nobranch: "GitHub no tiene la rama {0} en {1}",
        bad: "Escriba el repositorio como owner/name en el menú del grupo, Ajustes del plugin",
        nothing: "Active issues, pull requests o commits en el menú del grupo, Ajustes del plugin",
        issues: "Issues abiertas", pulls: "Pull requests abiertas", commits: "Últimos commits",
        noIssues: "No hay issues abiertas", noPulls: "No hay pull requests abiertas", noCommits: "No hay commits",
        tip: "{0}, {1}" },
  "pt-BR": { updated: "Atualizado às {0}, clique para atualizar", loading: "Consultando o GitHub…",
             failed: "Sem resposta do GitHub, nova tentativa às {0}",
             limited: "O GitHub pede para esperar, nova tentativa às {0}",
             missing: "O GitHub não tem um repositório público {0}", nobranch: "O GitHub não tem o branch {0} em {1}",
             bad: "Escreva o repositório como owner/name no menu do grupo, Configurações do plugin",
             nothing: "Ative issues, pull requests ou commits no menu do grupo, Configurações do plugin",
             issues: "Issues abertas", pulls: "Pull requests abertas", commits: "Últimos commits",
             noIssues: "Nenhuma issue aberta", noPulls: "Nenhuma pull request aberta", noCommits: "Nenhum commit",
             tip: "{0}, {1}" },
  ru: { updated: "Обновлено в {0}, щёлкните, чтобы обновить", loading: "Запрос к GitHub…",
        failed: "GitHub не отвечает, новая попытка в {0}", limited: "GitHub просит подождать, новая попытка в {0}",
        missing: "На GitHub нет открытого репозитория {0}", nobranch: "На GitHub в {1} нет ветки {0}",
        bad: "Укажите репозиторий в виде owner/name в меню области, Настройки плагина",
        nothing: "Включите задачи, пул-реквесты или коммиты в меню области, Настройки плагина",
        issues: "Открытые задачи", pulls: "Открытые пул-реквесты", commits: "Последние коммиты",
        noIssues: "Нет открытых задач", noPulls: "Нет открытых пул-реквестов", noCommits: "Нет коммитов",
        tip: "{0}, {1}" },
  it: { updated: "Aggiornato alle {0}, clicca per aggiornare", loading: "Richiesta a GitHub…",
        failed: "Nessuna risposta da GitHub, nuovo tentativo alle {0}",
        limited: "GitHub chiede di aspettare, nuovo tentativo alle {0}",
        missing: "GitHub non ha un repository pubblico {0}", nobranch: "GitHub non ha il branch {0} in {1}",
        bad: "Scrivi il repository come owner/name nel menu del riquadro, Impostazioni del plugin",
        nothing: "Attiva issue, pull request o commit nel menu del riquadro, Impostazioni del plugin",
        issues: "Issue aperte", pulls: "Pull request aperte", commits: "Ultimi commit",
        noIssues: "Nessuna issue aperta", noPulls: "Nessuna pull request aperta", noCommits: "Nessun commit",
        tip: "{0}, {1}" },
};
let t = TEXTS[pf.lang] || TEXTS.en;
pf.on("lang", () => { t = TEXTS[pf.lang] || TEXTS.en; draw(); });
const fill = (text, ...values) => text.replace(/\{(\d)\}/g, (_, i) => String(values[i]));
const MINUTE = 60 * 1000;

let lists = {}; // the last lists by kind: { issues: [{ id, url, text, tip }], pulls: [...], commits: [...] }
let fetchedAt = 0;
let nextAt = 0; // when to ask next
let waitUntil = 0; // GitHub asked to wait until then: clicks wait too
let problem = "";
let busy = false;
let settled = 0; // the timer that asks 2 seconds after the last settings change

// The setting as owner/name; a pasted github.com address works too. "" when it is not one (a
// part of only dots, such as "..", would make another address of the API).
function repo() {
  const r = String(pf.settings.repo || "").trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/(\.git)?\/*$/, "");
  return /^[\w.-]+\/[\w.-]+$/.test(r) && !r.split("/").some((part) => /^\.+$/.test(part)) ? r : "";
}

// The lists the user turned on, in the order issues, pull requests, commits.
const enabled = () => KINDS.filter((kind) => Boolean(pf.settings[kind]));

// How many rows each list shows: the setting "rows", a whole number from 1 to MAX_ROWS.
function rowCount() {
  const n = Math.floor(Number(pf.settings.rows));
  return n >= 1 ? Math.min(n, MAX_ROWS) : DEFAULT_ROWS;
}

// The branch of the commits; "" asks for the repository's default branch (also for a text that
// cannot be a branch name).
function branch() {
  const b = String(pf.settings.branch || "").trim();
  return b.length <= 255 && !/[\x00-\x1f\x7f\s]/.test(b) ? b : "";
}

// What the answer on the way is for: another value after it came means the settings changed.
const signature = () => [repo(), enabled().join(","), rowCount(), enabled().includes("commits") ? branch() : ""].join("|");

// The page of GitHub a list's title opens.
function page(kind, name) {
  if (kind !== "commits") return `https://github.com/${name}/${kind === "issues" ? "issues" : "pulls"}`;
  const b = branch();
  return `https://github.com/${name}/commits` + (b ? "/" + b.split("/").map(encodeURIComponent).join("/") : "");
}

function endpoint(kind, name, count) {
  const base = `https://api.github.com/repos/${name}`;
  // GitHub's issues include the pull requests: ask for more than will show, and drop those.
  if (kind === "issues") return `${base}/issues?state=open&per_page=${Math.max(20, count * 2)}`;
  if (kind === "pulls") return `${base}/pulls?state=open&per_page=${count}`;
  const b = branch();
  return `${base}/commits?per_page=${count}` + (b ? `&sha=${encodeURIComponent(b)}` : "");
}

const day = (iso) => pf.time.format(Date.parse(iso), "date");

function numbered(kind) {
  return (i) => ({
    id: `${kind}:${i.number}`,
    url: i.html_url,
    text: `#${i.number}  ${i.title}`,
    tip: fill(t.tip, i.user && i.user.login, day(i.created_at)),
  });
}

// From GitHub's answer to the rows of a list.
const PARSE = {
  issues: (answer, count) => answer.filter((i) => !i.pull_request).slice(0, count).map(numbered("issues")),
  pulls: (answer, count) => answer.slice(0, count).map(numbered("pulls")),
  commits: (answer, count) => answer.slice(0, count).map((c) => ({
    id: "commits:" + c.sha,
    url: c.html_url,
    text: `${c.sha.slice(0, 7)}  ${String(c.commit.message).split("\n")[0]}`,
    tip: fill(t.tip, (c.commit.author && c.commit.author.name) || (c.author && c.author.login) || "",
      c.commit.author && c.commit.author.date ? day(c.commit.author.date) : ""),
  })),
};

function draw() {
  const name = repo();
  if (!name) return pf.show({ rows: [{ text: t.bad, color: "orange" }] });
  const kinds = enabled();
  if (!kinds.length) return pf.show({ rows: [{ text: t.nothing, color: "orange" }] });
  const rows = [{ id: "repo", text: name, icon: "🐙", bold: true, tip: `https://github.com/${name}` }, { separator: true }];
  if (!kinds.some((kind) => lists[kind])) {
    // Before the first list, the row that says what went wrong is the one to click to ask again.
    rows.push({ text: problem || t.loading, color: "gray", ...(problem && { id: "refresh" }) });
    return pf.show({ rows });
  }
  kinds.forEach((kind, n) => {
    if (n) rows.push({ separator: true });
    const b = kind === "commits" ? branch() : "";
    rows.push({ id: "page:" + kind, text: t[kind] + (b ? ` · ${b}` : ""), icon: ICONS[kind], bold: true, color: "blue", tip: page(kind, name) });
    const list = lists[kind];
    if (!list) rows.push({ text: problem ? "…" : t.loading, color: "gray" });
    else if (!list.length) rows.push({ text: t[EMPTY[kind]], color: "gray" });
    else for (const i of list) rows.push({ id: i.id, text: i.text, tip: i.tip });
  });
  rows.push({ separator: true });
  if (problem) rows.push({ text: problem, color: "orange", size: "small" });
  rows.push({ id: "refresh", text: fill(t.updated, pf.time.format(fetchedAt, "time")), color: "gray", size: "small" });
  pf.show({ rows });
}

// How long GitHub asks to wait, in ms (0 when it does not).
function asked(answer) {
  const h = answer.headers;
  const after = Number(h["retry-after"]) || 0;
  if (after > 0) return after * 1000;
  if (h["x-ratelimit-remaining"] === "0") return Math.max(0, Number(h["x-ratelimit-reset"]) * 1000 - pf.time.now());
  return 0;
}

async function ask() {
  const name = repo();
  const kinds = enabled();
  if (busy || !name || !kinds.length) return;
  if (pf.time.now() < waitUntil) {
    problem = fill(t.limited, pf.time.format(waitUntil, "time"));
    return draw();
  }
  busy = true;
  const mine = signature();
  const count = rowCount();
  let wait = 10 * MINUTE;
  const at = (ms) => pf.time.format(pf.time.now() + ms, "time");
  const got = {};
  let found = true; // false when GitHub has no such repository or branch
  let trouble = "";
  try {
    // One request after the other: the next waits when GitHub asked to wait or answered badly.
    for (const [n, kind] of kinds.entries()) {
      const answer = await pf.http.get(endpoint(kind, name, count), {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      });
      const pause = asked(answer);
      if (answer.status === 200) {
        got[kind] = PARSE[kind](JSON.parse(answer.body), count);
      } else if (answer.status === 409 || answer.status === 410) {
        got[kind] = []; // a repository without commits, or with its issues turned off
      } else if (answer.status === 404) {
        found = false;
        trouble = kind === "commits" && branch() ? fill(t.nobranch, branch(), name) : fill(t.missing, name);
      } else if (pause > 0 || answer.status === 403 || answer.status === 429) {
        // Without Retry-After or a reset time, GitHub's limit for too many requests: 10 minutes.
        wait = pause > 0 ? pause : 10 * MINUTE;
        waitUntil = pf.time.now() + wait;
        trouble = fill(t.limited, at(wait));
      } else {
        trouble = fill(t.failed, at(wait));
      }
      // The limit is used up: the next request waits for its reset, and says so when lists are
      // still to come.
      if (pause > 0) {
        wait = Math.max(wait, pause);
        waitUntil = pf.time.now() + pause;
        if (!trouble && n < kinds.length - 1) trouble = fill(t.limited, at(wait));
      }
      if (trouble || pause > 0) break;
    }
  } catch (e) {
    trouble = fill(t.failed, at(wait));
  } finally {
    busy = false;
  }
  nextAt = pf.time.now() + wait;
  // The settings changed while the answers were on their way: they are for the old ones. The
  // 2 second wait after the change asks; when it ran out meanwhile (it found a request under
  // way), the new ones are asked now.
  if (signature() !== mine) {
    lists = {};
    problem = "";
    if (!settled) return ask();
    return draw();
  }
  if (!found) lists = {};
  else if (Object.keys(got).length) {
    Object.assign(lists, got);
    fetchedAt = pf.time.now();
  }
  problem = trouble;
  draw();
}

// Asks when it is time; the minute timer waits while the fence is hidden.
function due() {
  if (pf.time.now() >= nextAt) ask();
}

pf.on("start", () => {
  draw();
  ask();
});
pf.on("show", due);
pf.every(60, due);
pf.on("settings", () => {
  lists = {};
  problem = "";
  draw();
  pf.cancel(settled);
  settled = pf.after(2, () => {
    settled = 0;
    ask();
  });
});
pf.on("click", (e) => {
  const name = repo();
  if (e.id === "refresh") ask();
  if (e.id === "repo" && name) pf.open(`https://github.com/${name}`).catch(() => {});
  if (name && e.id.startsWith("page:") && KINDS.includes(e.id.slice(5))) pf.open(page(e.id.slice(5), name)).catch(() => {});
  // The address comes from GitHub's answer: PecoFence refuses it unless its host is github.com.
  const item = KINDS.flatMap((kind) => lists[kind] || []).find((i) => i.id === e.id);
  try {
    if (item) pf.open(item.url).catch(() => {});
  } catch (err) {
    problem = String(err.message);
    draw();
  }
});
