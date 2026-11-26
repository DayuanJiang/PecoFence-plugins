// Recipes: a meal idea with its ingredients, steps and photo, from free recipe services. TheMealDB,
// DummyJSON, Wikibooks Cookbook and Forkify need no account; Spoonacular, Recipe API and Tasty are
// used only when the user types their own free key in the settings. The setting "source" picks one,
// or "auto" goes through them in that order: a source that fails, says to wait (429, Retry-After),
// has no free quota left (402) or has nothing new to show is left alone for a while and the next one
// gives the idea. Nothing asks on its own except the refresh the user chose (daily by default);
// "Another idea" asks once. The photo of an idea, when its source gives one, is saved with
// pf.http.save into this fence's data files and shown above the buttons. The ideas shown last are
// kept in this fence's data file, so "back" works after a restart.

const TEXTS = {
  en: { loading: "Looking for a meal idea…", next: "Another idea", prev: "Previous idea", fwd: "Next in the history",
        ingredients: "Ingredients", recipe: "Recipe", servings: "{0} servings", min: "{0} min",
        source: "Source: {0}", openTip: "Open the recipe's web page", noSteps: "No steps given for this meal.",
        failed: "No new idea right now, trying again at {0}",
        nokey: "Add your {0} key in the plugin settings, or choose another source.",
        badKey: "{0} refused the key. Check it in the plugin settings.",
        otherSource: "Other source", otherTip: "Switch to the next source of recipes", comma: ",",
        stepsOnPage: "The steps are on the recipe's web page: click the title.",
        gone: "The terms of this service do not let its recipes be kept longer: the details are gone." },
  fr: { loading: "Recherche d'une idée de repas…", next: "Une autre idée", prev: "Idée précédente", fwd: "Suivante dans l'historique",
        ingredients: "Ingrédients", recipe: "Recette", servings: "{0} personnes", min: "{0} min",
        source: "Source : {0}", openTip: "Ouvrir la page de la recette", noSteps: "Aucune étape donnée pour ce plat.",
        failed: "Pas de nouvelle idée pour l'instant, nouvel essai à {0}",
        nokey: "Saisissez votre clé {0} dans les réglages du plugin, ou choisissez une autre source.",
        badKey: "{0} a refusé la clé. Vérifiez-la dans les réglages du plugin.",
        otherSource: "Autre source", otherTip: "Passer à la source de recettes suivante", comma: ",",
        stepsOnPage: "Les étapes sont sur la page web de la recette : cliquez sur le titre.",
        gone: "Les conditions de ce service n'autorisent pas à conserver ses recettes plus longtemps : le détail a été effacé." },
  de: { loading: "Suche nach einer Gericht-Idee…", next: "Noch eine Idee", prev: "Vorherige Idee", fwd: "Nächste im Verlauf",
        ingredients: "Zutaten", recipe: "Rezept", servings: "{0} Portionen", min: "{0} Min.",
        source: "Quelle: {0}", openTip: "Seite des Rezepts öffnen", noSteps: "Für dieses Gericht sind keine Schritte angegeben.",
        failed: "Gerade keine neue Idee, neuer Versuch um {0}",
        nokey: "Tragen Sie Ihren {0}-Schlüssel in den Plugin-Einstellungen ein oder wählen Sie eine andere Quelle.",
        badKey: "{0} hat den Schlüssel abgelehnt. Prüfen Sie ihn in den Plugin-Einstellungen.",
        otherSource: "Andere Quelle", otherTip: "Zur nächsten Rezeptquelle wechseln", comma: ",",
        stepsOnPage: "Die Schritte stehen auf der Webseite des Rezepts: auf den Titel klicken.",
        gone: "Die Bedingungen dieses Dienstes erlauben nicht, seine Rezepte länger aufzubewahren: die Details wurden gelöscht." },
  es: { loading: "Buscando una idea de comida…", next: "Otra idea", prev: "Idea anterior", fwd: "Siguiente del historial",
        ingredients: "Ingredientes", recipe: "Receta", servings: "{0} raciones", min: "{0} min",
        source: "Fuente: {0}", openTip: "Abrir la página de la receta", noSteps: "Este plato no indica pasos.",
        failed: "Ahora no hay ideas nuevas, se vuelve a intentar a las {0}",
        nokey: "Escriba su clave de {0} en los ajustes del plugin o elija otra fuente.",
        badKey: "{0} rechazó la clave. Compruébela en los ajustes del plugin.",
        otherSource: "Otra fuente", otherTip: "Cambiar a la siguiente fuente de recetas", comma: ",",
        stepsOnPage: "Los pasos están en la página web de la receta: haga clic en el título.",
        gone: "Las condiciones de este servicio no permiten conservar sus recetas más tiempo: se han borrado los detalles." },
  it: { loading: "Cerco un'idea per il pasto…", next: "Un'altra idea", prev: "Idea precedente", fwd: "Successiva nella cronologia",
        ingredients: "Ingredienti", recipe: "Ricetta", servings: "{0} porzioni", min: "{0} min",
        source: "Fonte: {0}", openTip: "Apri la pagina della ricetta", noSteps: "Nessun passaggio indicato per questo piatto.",
        failed: "Nessuna nuova idea al momento, nuovo tentativo alle {0}",
        nokey: "Inserisci la tua chiave {0} nelle impostazioni del plugin o scegli un'altra fonte.",
        badKey: "{0} ha rifiutato la chiave. Controllala nelle impostazioni del plugin.",
        otherSource: "Altra fonte", otherTip: "Passa alla fonte di ricette successiva", comma: ",",
        stepsOnPage: "I passaggi sono nella pagina web della ricetta: clicca sul titolo.",
        gone: "Le condizioni di questo servizio non consentono di conservare più a lungo le sue ricette: i dettagli sono stati cancellati." },
  "pt-BR": { loading: "Procurando uma ideia de refeição…", next: "Outra ideia", prev: "Ideia anterior", fwd: "Próxima do histórico",
             ingredients: "Ingredientes", recipe: "Receita", servings: "{0} porções", min: "{0} min",
             source: "Fonte: {0}", openTip: "Abrir a página da receita", noSteps: "Este prato não traz os passos.",
             failed: "Sem ideias novas agora, nova tentativa às {0}",
             nokey: "Digite sua chave do {0} nas configurações do plugin ou escolha outra fonte.",
             badKey: "O {0} recusou a chave. Confira nas configurações do plugin.",
             otherSource: "Outra fonte", otherTip: "Mudar para a próxima fonte de receitas", comma: ",",
        stepsOnPage: "Os passos estão na página web da receita: clique no título.",
        gone: "Os termos deste serviço não permitem guardar suas receitas por mais tempo: os detalhes foram apagados." },
  "zh-CN": { loading: "正在寻找菜品创意…", next: "换一个", prev: "上一个", fwd: "历史中的下一个",
             ingredients: "食材", recipe: "做法", servings: "{0} 人份", min: "{0} 分钟",
             source: "来源：{0}", openTip: "打开菜谱网页", noSteps: "这道菜没有给出步骤。",
             failed: "暂时没有新的创意，{0} 再试",
             nokey: "请在插件设置里填写你的 {0} 密钥，或选择其他来源。",
             badKey: "{0} 拒绝了这个密钥，请在插件设置里检查。",
             otherSource: "换个来源", otherTip: "切换到下一个菜谱来源", comma: "，",
        stepsOnPage: "步骤在菜谱网页上：点击标题打开。",
        gone: "该服务的条款不允许继续保存其菜谱：详情已清除。" },
  ja: { loading: "献立のアイデアを探しています…", next: "別のアイデア", prev: "前のアイデア", fwd: "履歴の次",
        ingredients: "材料", recipe: "作り方", servings: "{0} 人分", min: "{0} 分",
        source: "出典: {0}", openTip: "レシピのページを開く", noSteps: "この料理には手順がありません。",
        failed: "今は新しいアイデアがありません。{0} にもう一度試します",
        nokey: "プラグインの設定に {0} のキーを入力するか、別の取得元を選んでください。",
        badKey: "{0} がキーを受け付けませんでした。プラグインの設定で確認してください。",
        otherSource: "別の取得元", otherTip: "次のレシピの取得元に切り替える", comma: "、",
        stepsOnPage: "手順はレシピのページにあります。タイトルをクリックしてください。",
        gone: "このサービスの規約により、レシピを長く保存できません。詳細は削除されました。" },
};
let t = TEXTS[pf.lang] || TEXTS.en;
const fill = (text, ...values) => text.replace(/\{(\d)\}/g, (_, i) => String(values[i]));

const SOURCES = ["dummyjson", "wikibooks", "forkify", "mealdb", "spoonacular", "recipeapi", "tasty"];
const NAMES = {
  mealdb: "TheMealDB", dummyjson: "DummyJSON", wikibooks: "Wikibooks Cookbook", forkify: "Forkify",
  spoonacular: "Spoonacular", recipeapi: "Recipe API", tasty: "Tasty",
};
// The web page each source name opens (every host is in "network" or "links").
const SITES = {
  mealdb: "https://www.themealdb.com/",
  dummyjson: "https://dummyjson.com/docs/recipes",
  wikibooks: "https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents",
  forkify: "https://forkify-api.jonas.io/",
  spoonacular: "https://spoonacular.com/food-api",
  recipeapi: "https://recipe-api.com/",
  tasty: "https://tasty.co/",
};
const SOURCE_TIPS = {
  en: "Open the source's web page", fr: "Ouvrir le site de la source", de: "Webseite der Quelle öffnen",
  es: "Abrir la página web de la fuente", it: "Apri il sito della fonte", "pt-BR": "Abrir o site da fonte",
  "zh-CN": "打开来源网站", ja: "出典のサイトを開く",
};
// The sources that need the user's own key, and the setting that holds it.
const KEYS = { mealdb: "mealdbKey", spoonacular: "spoonacularKey", recipeapi: "recipeApiKey", tasty: "tastyKey" };
// The sites Forkify's recipes come from, the 18 most frequent (about 94 % of its recipes): hosts of
// "links" in plugin.json, which holds 20 at most. Forkify has no steps, only the page of the site a
// recipe comes from, so a recipe from another site is not taken.
const FORKIFY_SITES = [
  "allrecipes.com", "www.bbcgoodfood.com", "thepioneerwoman.com", "www.closetcooking.com",
  "www.realsimple.com", "www.twopeasandtheirpod.com", "www.epicurious.com", "www.simplyrecipes.com",
  "www.bonappetit.com", "www.101cookbooks.com", "www.chow.com", "www.jamieoliver.com", "www.bbc.co.uk",
  "smittenkitchen.com", "www.mybakingaddiction.com", "whatsgabycooking.com", "naturallyella.com",
  "tastykitchen.com",
];
const FORKIFY_TERMS = [
  "pizza", "pasta", "salad", "chicken", "soup", "cake", "bread", "curry", "beef", "pork", "fish", "rice",
  "potato", "cheese", "chocolate", "egg", "vegetable", "shrimp", "cookie", "pie",
];
// TheMealDB's address for a random meal, with the user's own key in the path. Its free test key is
// for development and learning only (its terms: "You cannot publish apps to an appstore unless you
// are a paid subscriber"), so the plugin never uses it: the key is the user's (a supporter's).
const mealdbUrl = (key) => `https://www.themealdb.com/api/json/v1/${encodeURIComponent(key)}/random.php`;
// A random page of the Cookbook (namespace 102) with its text and its picture, if it has one.
const WIKIBOOKS = "https://en.wikibooks.org/w/api.php?action=query&generator=random&grnnamespace=102&grnlimit=1"
  + "&prop=extracts|pageimages&explaintext=1&exsectionformat=wiki&piprop=thumbnail&pithumbsize=480"
  + "&format=json&formatversion=2&maxlag=5";
// Wikimedia asks every client for a User-Agent with contact information; the plugin host's cannot
// be changed by a plugin, so the plugin gives its own in "Api-User-Agent", the header Wikimedia's
// policy names for clients that cannot set the User-Agent. The contact is the plugin's project page,
// written as text for Wikimedia's administrators (never an address the plugin asks for anything).
const WIKIMEDIA_AGENT = { "api-user-agent": "PecoFence-Recipes/1.0 (github.com/DayuanJiang/PecoFence-plugins)" };
const FORKIFY = "https://forkify-api.jonas.io/api/v2/recipes";
const RECIPEAPI = "https://recipe-api.com/api/v1/recipes";
const TASTY = "https://tasty.p.rapidapi.com/recipes/list";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_HISTORY = 20;
const MAX_SEEN = 400;
// Ideas with an ingredient to avoid that one source gives in a row before it is left alone for a while.
const MAX_BLOCKED = 4;
const PHOTO_HEIGHT = 140;
// How long a service lets its recipes be kept, by its terms: Spoonacular's cache may last one hour
// at most (only the id, the title and the picture's address may be kept longer); Recipe API's free
// plans allow no caching, so its recipes are never written to disk. Older ones lose their details.
const KEEP = { spoonacular: HOUR, recipeapi: 0 };
const FILE = pf.fence.id + "-recipes.json";

// What is kept: the ideas shown last (history, pos), the ids already shown by each source (seen),
// until when each source is left alone (cool), when the idea last changed, how many recipes
// DummyJSON holds (its ids run from 1 to total), how many Recipe API and Tasty told they have, the
// source the user switched to with "Other source" (forced, until they change the Source setting,
// which is kept in sourceSet to tell).
let st = { history: [], pos: -1, seen: {}, cool: {}, changedAt: 0, total: 50, counts: {}, forced: "", sourceSet: "" };
let problem = "";
let busy = false;
let askedAt = 0;

function fail(kind, wait, recipe) {
  return Object.assign(new Error(kind), { kind, wait, recipe });
}

// An answer's JSON; a refused or failed request throws what the caller does about it.
async function get(url, headers, keyed) {
  let answer;
  try {
    answer = await pf.http.get(url, headers ? { headers } : undefined);
  } catch (e) {
    throw fail("error", 10 * MINUTE);
  }
  const after = Number(answer.headers["retry-after"]) * 1000 || 0;
  if (answer.status === 200) {
    try {
      return JSON.parse(answer.body);
    } catch (e) {
      throw fail("error", 30 * MINUTE);
    }
  }
  if (answer.status === 404) return null;
  // 401, or 403 from a service that was sent the user's key: the key is not accepted.
  if (answer.status === 401 || (answer.status === 403 && keyed)) throw fail("badkey", HOUR);
  // 402: the free quota of the day is used up; it comes back at midnight UTC.
  if (answer.status === 402) throw fail("quota", Math.max(after, DAY - (pf.time.now() % DAY) + MINUTE));
  if (answer.status === 429) throw fail("limit", Math.max(after, 30 * MINUTE));
  throw fail("error", Math.max(after, 15 * MINUTE));
}

const clip = (text, n) => String(text || "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (items, n, max) => items.map((s) => clip(s, n)).filter(Boolean).slice(0, max);
const keyOf = (source) => String(pf.settings[KEYS[source]] || "").trim();
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const hostOf = (url) => ((/^https?:\/\/([^/:?#]+)/i.exec(String(url)) || [])[1] || "").toLowerCase();
// "PT1H15M" (an ISO 8601 duration) in minutes.
const isoMinutes = (text) => {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(String(text || ""));
  return m ? (Number(m[1]) || 0) * 1440 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0) : 0;
};
// 0.5 -> "0.5", 1.3333 -> "1.33", null -> "".
const amount = (n) => (Number(n) > 0 ? String(Number(Number(n).toFixed(2))) : "");

// TheMealDB writes its steps as lines, often with "step 1" lines or "1." in front.
function mealSteps(text) {
  let steps = String(text || "").split(/\r?\n/).map((s) => s.trim())
    .filter((s) => s && !/^(step\s*)?\d+[.)]?$/i.test(s))
    .map((s) => s.replace(/^(step\s*)?\d+[.)]\s+/i, ""));
  if (steps.length <= 2) steps = steps.flatMap((s) => (s.length > 200 ? s.split(/(?<=[.!?])\s+/) : [s]));
  return list(steps, 600, 40);
}

function fromMealdbMeal(m) {
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const name = clip(m["strIngredient" + i], 80);
    if (name) items.push(`${clip(m["strMeasure" + i], 40)} ${name}`.trim());
  }
  return {
    src: "mealdb", id: String(m.idMeal), title: clip(m.strMeal, 120),
    tags: list([m.strCategory, m.strArea], 40, 2), minutes: 0, servings: 0,
    ingredients: list(items, 200, 40), steps: mealSteps(m.strInstructions),
    url: `https://www.themealdb.com/meal/${encodeURIComponent(m.idMeal)}`,
    // TheMealDB serves its pictures at 3 sizes: /small, /medium and /large.
    photoUrl: m.strMealThumb ? m.strMealThumb + "/medium" : null,
  };
}

async function fromMealdb(repeatOk) {
  const key = keyOf("mealdb");
  if (!key) throw fail("nokey", 0);
  const seen = new Set(st.seen.mealdb || []);
  let again = null;
  for (let i = 0; i < 3; i++) {
    const data = await get(mealdbUrl(key), null, true);
    const meal = data && data.meals && data.meals[0];
    if (!meal || !meal.idMeal || !meal.strMeal) throw fail("error", 30 * MINUTE);
    if (!seen.has(String(meal.idMeal))) return fromMealdbMeal(meal);
    again = meal;
  }
  // Three ideas in a row that were shown already: nothing new here for a while.
  if (repeatOk) return fromMealdbMeal(again);
  throw fail("empty", 12 * HOUR);
}

async function fromDummyjson(repeatOk) {
  const seen = new Set(st.seen.dummyjson || []);
  const all = Array.from({ length: st.total }, (_, i) => i + 1);
  let pool = all.filter((id) => !seen.has(String(id)));
  if (!pool.length) {
    if (!repeatOk) throw fail("empty", 12 * HOUR);
    pool = all;
  }
  const id = pick(pool);
  const r = await get(`https://dummyjson.com/recipes/${id}`);
  if (!r || !r.name) {
    // No such recipe: the list is shorter than thought.
    st.total = Math.max(1, id - 1);
    throw fail("error", 5 * MINUTE);
  }
  return {
    src: "dummyjson", id: String(r.id), title: clip(r.name, 120),
    tags: list([r.cuisine, r.difficulty], 40, 2),
    minutes: (Number(r.prepTimeMinutes) || 0) + (Number(r.cookTimeMinutes) || 0), servings: Number(r.servings) || 0,
    ingredients: list(r.ingredients || [], 200, 40), steps: list(r.instructions || [], 600, 40), url: null,
    photoUrl: r.image || null,
  };
}

// The text of a Cookbook page cut at its headings ("== Ingredients =="), each with its level.
function wikiSections(text) {
  const sections = [];
  let current = null;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const head = /^(=+)\s*(.*?)\s*=+\s*$/.exec(raw);
    if (head) {
      current = { name: clip(head[2].replace(/:$/, ""), 80), level: head[1].length, lines: [] };
      sections.push(current);
    } else if (current && raw.trim()) {
      current.lines.push(raw.trim());
    }
  }
  return sections;
}

// The ingredients and the steps of a Cookbook page: the lines under its "Ingredients" and
// "Procedure" headings (and the headings below them, which name a part of the dish).
function wikiRecipe(text) {
  const found = { ingredients: [], steps: [] };
  let into = null;
  for (const s of wikiSections(text)) {
    if (s.level === 2) {
      if (/^ingredients?\b/i.test(s.name)) into = "ingredients";
      else if (/^(procedure|directions?|method|instructions?|preparation|steps?)\b/i.test(s.name)) into = "steps";
      else into = null;
    }
    if (!into) continue;
    if (s.level > 2 && into === "ingredients") found.ingredients.push(s.name + ":");
    found[into].push(...s.lines);
  }
  return found;
}

async function fromWikibooks(repeatOk) {
  const seen = new Set(st.seen.wikibooks || []);
  let again = null;
  // Many pages of the Cookbook are not recipes (indexes, tips): a few tries for one that is.
  for (let i = 0; i < 3; i++) {
    const data = await get(WIKIBOOKS, WIKIMEDIA_AGENT);
    const page = data && data.query && data.query.pages && data.query.pages[0];
    if (!page || !page.pageid || !page.title) continue;
    const found = wikiRecipe(page.extract);
    if (!found.ingredients.length || !found.steps.length) continue;
    const idea = {
      src: "wikibooks", id: String(page.pageid), title: clip(String(page.title).replace(/^cookbook:/i, ""), 120),
      tags: ["CC BY-SA"], minutes: 0, servings: 0,
      ingredients: list(found.ingredients, 200, 40), steps: list(found.steps, 600, 40),
      url: `https://en.wikibooks.org/?curid=${encodeURIComponent(page.pageid)}`,
      photoUrl: page.thumbnail && page.thumbnail.source ? page.thumbnail.source : null,
    };
    if (!seen.has(idea.id)) return idea;
    again = idea;
  }
  if (again) {
    if (repeatOk) return again;
    throw fail("empty", 12 * HOUR);
  }
  throw fail("error", 30 * MINUTE);
}

// One Forkify recipe by its id: ingredients and the page it comes from, but no steps.
async function forkifyIdea(id) {
  const found = await get(`${FORKIFY}/${encodeURIComponent(id)}`);
  const r = found && found.data && found.data.recipe;
  if (!r || !r.title) throw fail("error", 30 * MINUTE);
  const items = (r.ingredients || []).map((i) => [amount(i.quantity), i.unit, i.description].filter(Boolean).join(" "));
  return {
    src: "forkify", id: String(r.id), title: clip(r.title, 120), tags: list([r.publisher], 40, 1),
    minutes: Number(r.cooking_time) || 0, servings: Number(r.servings) || 0,
    ingredients: list(items, 200, 40), steps: [],
    url: FORKIFY_SITES.includes(hostOf(r.source_url)) ? String(r.source_url) : null,
    photoUrl: r.image_url || null,
  };
}

// Forkify has no random recipe: a search for a word gives a list, and one recipe of it is taken.
async function fromForkify(repeatOk) {
  const seen = new Set(st.seen.forkify || []);
  let again = null;
  for (let i = 0; i < 3; i++) {
    const data = await get(`${FORKIFY}?search=${encodeURIComponent(pick(FORKIFY_TERMS))}`);
    const all = ((data && data.data && data.data.recipes) || []).filter((r) => r && r.id);
    if (all.length) again = pick(all);
    const fresh = all.filter((r) => !seen.has(String(r.id)));
    if (!fresh.length) continue;
    const idea = await forkifyIdea(pick(fresh).id);
    if (idea.url) return idea;
    // From a site the plugin may not open: no steps and no page to read them, so no idea. It counts
    // as shown, not to be met again.
    seen.add(idea.id);
    st.seen.forkify = [...(st.seen.forkify || []), idea.id].slice(-MAX_SEEN);
    again = idea;
  }
  if (!again) throw fail("error", 30 * MINUTE);
  if (repeatOk) {
    const idea = await forkifyIdea(again.id);
    if (idea.url) return idea;
  }
  throw fail("empty", 12 * HOUR);
}

async function fromSpoonacular() {
  const key = keyOf("spoonacular");
  if (!key) throw fail("nokey", 0);
  const data = await get("https://api.spoonacular.com/recipes/random?number=1", { "x-api-key": key }, true);
  const r = data && data.recipes && data.recipes[0];
  if (!r || !r.title) throw fail("error", 30 * MINUTE);
  let steps = (r.analyzedInstructions || []).flatMap((a) => (a.steps || []).map((s) => s.step));
  if (!steps.length && r.instructions) steps = String(r.instructions).replace(/<[^>]*>/g, "\n").split(/\n+/);
  const page = String(r.spoonacularSourceUrl || "");
  return {
    src: "spoonacular", id: String(r.id), title: clip(r.title, 120),
    // Spoonacular's terms ask to credit the recipe's original source by name.
    tags: list([r.sourceName ? "via " + r.sourceName : "", ...(r.cuisines || []), ...(r.dishTypes || [])], 40, 3),
    minutes: Number(r.readyInMinutes) || 0, servings: Number(r.servings) || 0,
    ingredients: list((r.extendedIngredients || []).map((i) => i.original), 200, 40),
    steps: list(steps, 600, 40), url: page.startsWith("https://spoonacular.com/") ? page : null,
    photoUrl: r.image || null,
  };
}

// Recipe API: a list of one recipe at a random page (free of credit) gives an id, then the recipe
// (one credit of the free plan). Its search finds at most 500 recipes. It has no pictures.
async function fromRecipeapi(repeatOk) {
  const key = keyOf("recipeapi");
  if (!key) throw fail("nokey", 0);
  const auth = { "x-api-key": key };
  const seen = new Set(st.seen.recipeapi || []);
  let chosen = null;
  let again = null;
  for (let i = 0; i < 4 && !chosen; i++) {
    const total = st.counts.recipeapi || 0;
    const page = total ? 1 + Math.floor(Math.random() * total) : 1;
    const data = await get(`${RECIPEAPI}?per_page=1&page=${page}`, auth, true);
    if (data && data.meta && Number(data.meta.total) > 0) st.counts.recipeapi = Math.min(Number(data.meta.total), 500);
    const item = data && data.data && data.data[0];
    if (!item || !item.id) continue;
    if (!seen.has(String(item.id))) chosen = item;
    else again = item;
  }
  chosen = chosen || (repeatOk ? again : null);
  if (!chosen) throw fail(again ? "empty" : "error", again ? 12 * HOUR : 30 * MINUTE);
  const found = await get(`${RECIPEAPI}/${encodeURIComponent(chosen.id)}`, auth, true);
  const r = found && found.data;
  if (!r || !r.name) throw fail("error", 30 * MINUTE);
  const groups = (r.ingredients || []).filter((g) => g && g.items);
  const items = groups.flatMap((g) => [
    ...(groups.length > 1 && g.group_name ? [g.group_name + ":"] : []),
    ...g.items.map((i) => [amount(i.quantity), i.unit, i.name].filter(Boolean).join(" ") + (i.preparation ? ", " + i.preparation : "")),
  ]);
  const meta = r.meta || {};
  return {
    src: "recipeapi", id: String(chosen.id), title: clip(r.name, 120),
    tags: list([r.cuisine, r.difficulty], 40, 2),
    minutes: isoMinutes(meta.total_time), servings: Number(meta.yield_count) || 0,
    ingredients: list(items, 200, 40), steps: list((r.instructions || []).map((s) => s.text), 600, 40),
    url: null, photoUrl: null,
  };
}

// Tasty (on RapidAPI): one recipe of its list at a random place; the answer says how many there
// are. Some entries are compilations with no steps, passed over.
async function fromTasty(repeatOk) {
  const key = keyOf("tasty");
  if (!key) throw fail("nokey", 0);
  const auth = { "x-rapidapi-key": key, "x-rapidapi-host": "tasty.p.rapidapi.com" };
  const seen = new Set(st.seen.tasty || []);
  let again = null;
  for (let i = 0; i < 4; i++) {
    const total = st.counts.tasty || 2000;
    const data = await get(`${TASTY}?from=${Math.floor(Math.random() * total)}&size=1`, auth, true);
    if (!data) continue;
    if (Number(data.count) > 0) st.counts.tasty = Number(data.count);
    const r = data.results && data.results[0];
    if (!r || !r.id || !r.name || !(r.instructions || []).length) continue;
    const parts = (r.sections || []).flatMap((s) => [
      ...(s.name && (r.sections || []).length > 1 ? [s.name + ":"] : []),
      ...(s.components || []).map((c) => c.raw_text).filter((x) => x && x !== "n/a"),
    ]);
    const steps = [...r.instructions].sort((a, b) => (a.position || 0) - (b.position || 0)).map((s) => s.display_text);
    const tags = (r.tags || []).filter((x) => ["cuisine", "meal", "dietary"].includes(x.type)).map((x) => x.display_name);
    const idea = {
      src: "tasty", id: String(r.id), title: clip(r.name, 120), tags: list(tags, 40, 2),
      minutes: Number(r.total_time_minutes) || (Number(r.prep_time_minutes) || 0) + (Number(r.cook_time_minutes) || 0),
      servings: Number(r.num_servings) || 0, ingredients: list(parts, 200, 40), steps: list(steps, 600, 40),
      url: r.slug ? `https://tasty.co/recipe/${encodeURIComponent(r.slug)}` : null,
      photoUrl: r.thumbnail_url || null,
    };
    if (!seen.has(idea.id)) return idea;
    again = idea;
  }
  if (again) {
    if (repeatOk) return again;
    throw fail("empty", 12 * HOUR);
  }
  throw fail("error", 30 * MINUTE);
}

const PROVIDERS = {
  mealdb: fromMealdb, dummyjson: fromDummyjson, wikibooks: fromWikibooks, forkify: fromForkify,
  spoonacular: fromSpoonacular, recipeapi: fromRecipeapi, tasty: fromTasty,
};

// The text without capitals or accents, to compare words.
function plain(text) {
  let s = String(text || "").toLowerCase();
  try {
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch (e) {
    // no normalisation here: capitals are enough
  }
  return s;
}

// The words typed in the setting "Ingredients to avoid" (separated by commas, semicolons or lines).
function avoided() {
  return String(pf.settings.excluded || "").split(/[,;\n]+/).map((s) => plain(s).trim()).filter((s) => s.length >= 2);
}

// Whether an idea names one of them in its title, its ingredients or its steps.
function blocked(idea) {
  const words = avoided();
  if (!words.length) return false;
  const text = plain([idea.title, ...idea.ingredients, ...idea.steps].join("\n"));
  return words.some((w) => text.includes(w));
}

// The source in use: the one the user switched to with "Other source", else the setting.
function activeMode() {
  return st.forced || (SOURCES.includes(pf.settings.source) ? pf.settings.source : "auto");
}

// A new idea. "auto" tries the sources in order and passes over those that rest; a chosen source
// gives repeats when it has nothing new, rather than nothing. An idea with an ingredient to avoid
// counts as shown (so it does not come back) and another is asked for.
async function findIdea() {
  const mode = activeMode();
  const order = mode === "auto" ? SOURCES : [mode];
  let reason = "";
  for (const source of order) {
    const now = pf.time.now();
    if ((st.cool[source] || 0) > now) continue;
    if (KEYS[source] && mode === "auto" && !keyOf(source)) continue;
    try {
      for (let tries = 0; tries < MAX_BLOCKED; tries++) {
        const idea = await PROVIDERS[source](mode !== "auto");
        if (!blocked(idea)) {
          delete st.cool[source];
          return idea;
        }
        const seen = st.seen[source] || [];
        seen.push(idea.id);
        st.seen[source] = seen.slice(-MAX_SEEN);
      }
      throw fail("blocked", 2 * MINUTE);
    } catch (e) {
      if (!e.kind) throw e;
      st.cool[source] = pf.time.now() + e.wait;
      if (e.kind === "empty") st.seen[source] = [];
      if (e.kind === "nokey") reason = fill(t.nokey, NAMES[source]);
      if (e.kind === "badkey") reason = fill(t.badKey, NAMES[source]);
    }
  }
  const until = Math.min(...order.map((s) => st.cool[s] || Infinity));
  problem = reason || fill(t.failed, pf.time.format(Number.isFinite(until) ? until : pf.time.now() + 5 * MINUTE, "time"));
  return null;
}

// A short name from the idea's source and id, in this fence's own data files (they go with the
// fence), with the picture's own extension.
function hashOf(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Saves the idea's photo, if its source gave one and the user wants it, and returns the name of
// the data file ("" when there is none: the idea shows without it).
async function savePhoto(idea) {
  const url = String(idea.photoUrl || "").replace(/^http:/i, "https:");
  if (!url || pf.settings.photo === false || typeof pf.http.save !== "function") return "";
  const ext = (/\.(png|gif|webp|jpe?g)(?:$|[?\/])/i.exec(url) || [])[1];
  const name = `${pf.fence.id}-ph-${hashOf(idea.src + ":" + idea.id)}.${ext ? ext.toLowerCase() : "jpg"}`;
  try {
    const wikimedia = idea.src === "wikibooks" ? { headers: WIKIMEDIA_AGENT } : undefined;
    const answer = await pf.http.save(url, name, wikimedia);
    return answer.status === 200 ? name : "";
  } catch (e) {
    return "";
  }
}

const current = () => st.history[st.pos] || null;

// Takes out of the history the ideas with an ingredient to avoid (and their photos), and keeps the
// idea shown when it is not one of them.
function purge() {
  const shown = current();
  const keep = st.history.filter((r) => !blocked(r));
  if (keep.length === st.history.length) return;
  for (const r of st.history) {
    if (r.photo && !keep.some((k) => k.photo === r.photo)) pf.data.remove(r.photo).catch(() => {});
  }
  const at = keep.indexOf(shown);
  st.history = keep;
  st.pos = at >= 0 ? at : keep.length - 1;
}

// "Other source": the next source after the idea's that can be asked (no key needed, or one typed,
// and not resting), kept until the user changes the Source setting. Returns false when there is none.
function otherSource() {
  const r = current();
  const from = SOURCES.indexOf(r ? r.src : st.forced);
  for (let i = 1; i <= SOURCES.length; i++) {
    const source = SOURCES[(from + i + SOURCES.length) % SOURCES.length];
    if ((KEYS[source] && !keyOf(source)) || (st.cool[source] || 0) > pf.time.now()) continue;
    st.forced = source;
    return true;
  }
  return false;
}

// The idea without what its service does not let be kept: the details and the photo.
const emptied = (r) => ({ ...r, ingredients: [], steps: [], photo: "", gone: true });

// Takes the details of the ideas kept longer than their service lets (Spoonacular's hour) and
// deletes their photos. Returns whether something went.
function expire() {
  const now = pf.time.now();
  let changed = false;
  st.history = st.history.map((r) => {
    if (r.gone || !(KEEP[r.src] > 0) || now - (r.at || 0) < KEEP[r.src]) return r;
    if (r.photo) pf.data.remove(r.photo).catch(() => {});
    changed = true;
    return emptied(r);
  });
  return changed;
}

// What is written to disk: the ideas of a service that allows no caching go without details.
function save() {
  const kept = { ...st, history: st.history.map((r) => (r.src in KEEP && KEEP[r.src] === 0 ? emptied(r) : r)) };
  pf.data.write(FILE, JSON.stringify(kept)).catch(() => {});
}

async function another() {
  if (busy || pf.time.now() - askedAt < 2000) return;
  busy = true;
  askedAt = pf.time.now();
  try {
    problem = "";
    const idea = await findIdea();
    if (idea) {
      idea.photo = await savePhoto(idea);
      idea.at = pf.time.now();
      delete idea.photoUrl;
      st.history.push(idea);
      // The photo of an idea that leaves the history goes with it, unless another idea has it.
      const old = st.history.length > MAX_HISTORY ? st.history.shift() : null;
      if (old && old.photo && !st.history.some((r) => r.photo === old.photo)) {
        pf.data.remove(old.photo).catch(() => {});
      }
      st.pos = st.history.length - 1;
      st.changedAt = pf.time.now();
      const seen = st.seen[idea.src] || [];
      seen.push(idea.id);
      st.seen[idea.src] = seen.slice(-MAX_SEEN);
    }
  } catch (e) {
    problem = fill(t.failed, pf.time.format(pf.time.now() + 5 * MINUTE, "time"));
  } finally {
    busy = false;
  }
  save();
  draw();
}

// "Source: TheMealDB, Other source": the name opens the source's site (in blue), the last words
// switch to the next source of recipes.
function sourceCells(src) {
  const before = t.source.split("{0}")[0].trim();
  const cells = [];
  if (before) cells.push({ text: before, color: "gray" });
  cells.push({ text: NAMES[src] + t.comma, color: "blue", id: "source", tip: SOURCE_TIPS[pf.lang] || SOURCE_TIPS.en });
  cells.push({ text: t.otherSource, color: "blue", id: "other", tip: t.otherTip });
  return cells;
}

function draw() {
  const r = current();
  if (!r) {
    pf.show({ rows: [{ id: "next", text: problem || t.loading, color: problem ? "orange" : "gray" }] });
    return;
  }
  const facts = [...r.tags];
  if (r.minutes) facts.push(fill(t.min, r.minutes));
  if (r.servings) facts.push(fill(t.servings, r.servings));
  const buttons = [];
  if (st.pos > 0) buttons.push({ id: "prev", text: "‹", tip: t.prev });
  buttons.push({ id: "next", text: t.next, fill: true });
  if (st.pos < st.history.length - 1) buttons.push({ id: "fwd", text: "›", tip: t.fwd });
  const open = r.url ? { id: "open", tip: t.openTip } : {};
  const rows = [{ text: r.title, size: "large", bold: true, ...open }];
  if (facts.length) rows.push({ text: facts.join("  ·  "), size: "small", color: "gray" });
  // The photo, above the buttons, opens the recipe's page as the title does.
  if (r.photo && pf.settings.photo !== false) rows.push({ image: r.photo, height: PHOTO_HEIGHT, ...open });
  rows.push({ cells: buttons }, { cells: sourceCells(r.src) });
  if (problem) rows.push({ text: problem, size: "small", color: "orange" });
  rows.push({ separator: true });
  // The title and the buttons stay in place; the recipe scrolls under them.
  rows.push({ text: t.ingredients, bold: true, pane: "recipe" });
  for (const item of r.ingredients) rows.push({ text: "• " + item, tip: item });
  rows.push({ text: t.recipe, bold: true });
  if (r.gone) rows.push({ text: t.gone, color: "gray" });
  else if (!r.steps.length) rows.push({ text: r.url ? t.stepsOnPage : t.noSteps, color: "gray" });
  r.steps.forEach((step, i) => rows.push({ text: `${i + 1}. ${step}`, tip: step }));
  pf.show({ rows });
}

// The refresh the user chose: a new idea each day (the first time the fence shows after midnight)
// or each hour.
function due() {
  if (expire()) {
    save();
    draw();
  }
  const mode = pf.settings.refresh;
  if (busy || !current() || (mode !== "daily" && mode !== "hourly")) return;
  const now = pf.time.now();
  const later = mode === "hourly"
    ? now - st.changedAt >= HOUR
    : pf.time.format(now, "date") !== pf.time.format(st.changedAt, "date");
  if (later) another();
}

async function load() {
  try {
    const text = await pf.data.read(FILE);
    const saved = text ? JSON.parse(text) : null;
    if (saved && Array.isArray(saved.history)) st = { ...st, ...saved };
  } catch (e) {
    // no usable file: start empty
  }
  // A Source setting changed since (or ideas now with an ingredient to avoid): the old choices go.
  if (st.sourceSet !== pf.settings.source) st.forced = "";
  st.sourceSet = pf.settings.source;
  purge();
  expire();
  draw();
  if (!current()) another();
  else due();
}

pf.on("start", load);
pf.on("show", due);
pf.every(60, due);
pf.on("lang", () => {
  t = TEXTS[pf.lang] || TEXTS.en;
  draw();
});
pf.on("settings", () => {
  problem = "";
  // A key typed or corrected is tried at once: the rest a refused key put its source to is over.
  for (const source of Object.keys(KEYS)) delete st.cool[source];
  if (st.sourceSet !== pf.settings.source) st.forced = "";
  st.sourceSet = pf.settings.source;
  // An idea shown with an ingredient to avoid, typed now, gives way to a new one.
  const hidden = !!current() && blocked(current());
  purge();
  save();
  draw();
  if (hidden || !current()) another();
});
pf.on("click", (e) => {
  const r = current();
  // pf.open works only before the handler's first await.
  const open = (url) => {
    try {
      pf.open(url);
    } catch (err) {
      // not allowed here: nothing to do
    }
  };
  if (e.id === "open" && r && r.url) {
    open(r.url);
  } else if (e.id === "source" && r && SITES[r.src]) {
    open(SITES[r.src]);
  } else if (e.id === "other") {
    if (otherSource()) another();
  } else if (e.id === "next") {
    another();
  } else if (e.id === "prev" && st.pos > 0) {
    st.pos--;
    save();
    draw();
  } else if (e.id === "fwd" && st.pos < st.history.length - 1) {
    st.pos++;
    save();
    draw();
  }
});
