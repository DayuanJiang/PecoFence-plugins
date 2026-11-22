# Recipes 菜谱

A meal idea with its photo, ingredients and steps. The title, the facts (category or cuisine, time,
servings), the photo and the buttons stay in place; the ingredients and the steps scroll under
them. **Another idea** shows a new one, the arrows go back and forth through the last 20 ideas
(kept across restarts), and a click on the title or on the photo opens the recipe's web page when
the source has one. Under the buttons, the name of the source opens the source's own site and **Other source** switches
to the next source of recipes (one that needs no key, or whose key is typed, and is not resting);
it stays that source until the Source setting is changed.

Needs plugin interface 3: the photo is saved with `pf.http.save`, which a PecoFence newer than 0.5.0
has.

## Sources

| Source | Needs | What it gives |
|---|---|---|
| [TheMealDB](https://www.themealdb.com) | nothing | a random meal from its open database, with its photo; the public test key `1` its documentation gives for development and learning is in the address |
| [DummyJSON](https://dummyjson.com/docs/recipes) | nothing | about 50 sample recipes with a photo, each shown once before it comes back |
| [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents) | nothing | a random page of the Cookbook, when it is a recipe (it has ingredients and a procedure); some pages have a photo. The text is under a CC BY-SA licence: the idea says "CC BY-SA" and the title's link goes to the page, where its authors are |
| [Forkify](https://forkify-api.jonas.io) | nothing | the ingredients and the photo of a recipe of a food site; the steps are on that site's page (the title opens it) |
| [Spoonacular](https://spoonacular.com/food-api) | your own free key | a random recipe with its photo; the free plan has a daily quota |
| [Recipe API](https://recipe-api.com) | your own free key | a recipe with ingredients and steps, no photo; the free evaluation gives a small number of recipes in all |
| [Tasty](https://rapidapi.com/apidojo/api/tasty) | your own free RapidAPI key | a recipe with its photo from BuzzFeed's Tasty; the free plan has a monthly quota |

The recipes are in English: the services do not translate them. The plugin's own texts follow
PecoFence's display language.

Setting **Source**: *Automatic* goes through the sources in the order of the table (those that need
a key only when one is typed). A source that fails, says to wait (`Retry-After`), has used up its
free quota or has nothing new to show (three ideas in a row already shown, or all of DummyJSON's
shown) is left alone for a while (15 minutes to 12 hours, until midnight UTC for a used-up daily
quota) and the next one gives the idea. When every source rests, the fence says until when and
keeps the ideas it has. Choosing one source gives repeats rather than nothing.

Setting **New idea**: *Every day* (the default, the first time the fence shows after midnight),
*Every hour* or *Only when I click*.

Setting **Ingredients to avoid**: words or foods separated by commas (in English, as the recipes
are), for an allergy or a diet. A recipe whose title, ingredients or steps contain one of them, with
no regard to capitals or accents (`nut` also catches `peanut` and `walnut`), is never shown: the
plugin asks for another one, and removes from the last 20 ideas those that contain it. This is a
help, not a guarantee: an ingredient that is named otherwise or hidden in a prepared product is not
caught.

Setting **Show the photo**: on by default. Off, no photo is downloaded and the fence is shorter.

Settings **Spoonacular key**, **Recipe API key** and **Tasty (RapidAPI) key**: optional. Make a free
account on the service, copy the key and type it here; PecoFence keeps it encrypted on this
computer. Without a key that source is never asked.

## When the plugin contacts a site, and what for

The plugin never contacts a site on its own account. It asks a recipe service only when it needs a
new idea, and only while its fence is shown (it has no permission to run in the background).
A new idea is needed:

1. when you click **Another idea** or **Other source**;
2. when the refresh you chose is due: with **Every day** (the default) the first time the fence is
   shown after midnight, with **Every hour** an hour after the last idea, never with **Only when I
   click**;
3. when the fence has no idea yet (just added, or its history is empty);
4. when you type an ingredient to avoid and the idea shown contains it.

Looking at the fence, going back and forth in the last 20 ideas, scrolling, or opening the settings
sends nothing. For a new idea the plugin asks the source in use (with *Automatic*, the sources in
turn until one gives an idea), one to three requests, then downloads the idea's photo from the
service's picture host, when it has one. Nothing from your computer is in the requests, no account
or cookie either; like every web request they show the service your network address. They go to:

| Source | Asked for | Host |
|---|---|---|
| TheMealDB | one random meal; its photo | `www.themealdb.com` |
| DummyJSON | `https://dummyjson.com/recipes/<number>` for a number the plugin draws; the photo | `dummyjson.com`; `cdn.dummyjson.com` |
| Wikibooks Cookbook | one random page of the Cookbook with its text (up to three tries for one that is a recipe); the page's photo | `en.wikibooks.org`; `thumb.wikimedia.org` |
| Forkify | a search for a food word the plugin draws (pizza, soup...), then one recipe of it; its photo | `forkify-api.jonas.io`; `forkify-api.herokuapp.com` |
| Spoonacular | one random recipe, with your key in the `x-api-key` header; its photo | `api.spoonacular.com`; `img.spoonacular.com` |
| Recipe API | a list of one recipe at a page the plugin draws, then that recipe, with your key in the `x-api-key` header; no photo | `recipe-api.com` |
| Tasty | one recipe of Tasty's list at a place the plugin draws, with your RapidAPI key in the `x-rapidapi-key` header; its photo | `tasty.p.rapidapi.com`; `img.buzzfeed.com` |

The photo is saved as a file in this fence's data files on your computer, and deleted when the idea
leaves the last 20, as are the ideas shown last.

**Opening a page in your browser** happens only when you click, never by itself: the title or the
photo opens the recipe's own page, the name of the source opens the source's site. The sites listed
under "Opens these websites in your browser" in the plugin's details are those pages: the sources'
own sites (`www.themealdb.com`, `en.wikibooks.org`, `spoonacular.com`, `tasty.co`, ...) and the 18
sites Forkify's recipes mostly come from (allrecipes.com, bbcgoodfood.com, epicurious.com, ...). The
plugin never asks those 18 sites for anything: Forkify gives the ingredients but not the steps,
which are on the site the recipe comes from, so the title opens that page when you click it. A
plugin may declare 20 sites to open at most, so these are the 18 most frequent in Forkify (about
94 % of its recipes, seen when this was written); a Forkify recipe from another site is not shown.

## Terms of the services

Recipes and photos belong to their services and authors. What the plugin does for each:

- **TheMealDB**: the source line names it and links to it, the title links to the meal's page; only
  the official API is used (never the site's pages), with the `/medium` photo size.
- **DummyJSON**: its pages state no terms or limit; its data is sample data "for testing and
  prototyping".
- **Wikibooks Cookbook**: the text is shared under CC BY-SA (shown on the idea, with a link to the
  page and so to its authors); a photo has its own licence on Wikimedia Commons, and a click on it
  opens the page where it is credited. Requests go one at a time, with `maxlag`, and `Retry-After`
  and a "too many requests" answer put the source to rest, as Wikimedia asks.
- **Forkify**: a course API that allows 100 requests an hour (an answer to wait puts it to rest);
  its recipes belong to the sites they come from, which the idea names and the title links to.
- **Spoonacular**: its free plan asks for a link back and the original source's name: the idea says
  "via <that source>" and the title links to Spoonacular's page. Its terms let the data be cached
  for one hour only (only the id, the title and the picture's address may be kept longer), so the
  ingredients, steps and photo of a Spoonacular recipe are deleted from the plugin's files and from
  the fence an hour after they came; the title and the link stay, and the fence says so. Its terms
  also ask for a disclaimer about allergies: see the setting **Ingredients to avoid**.
- **Recipe API**: its free plans allow no caching, so its recipes are never written to disk (the
  last idea shows only its title after a restart); no credit is required.
- **Tasty**: through your own RapidAPI key and plan; check RapidAPI's and the plan's terms.

---

一个带照片、食材和步骤的菜品创意。标题、简要信息（类别或菜系、时间、份量）、照片和按钮固定在上面，食材和步骤在下面滚动。点「换一个」显示新的创意，箭头在最近 20 个创意之间前后翻（重启后仍保留），点标题或照片会在来源有网页时打开菜谱页面，点来源名称打开来源网站，点「换个来源」切换到下一个来源。「要避开的食材」设置可以填英文食材（逗号分隔），含有这些食材的菜谱不会显示。来源有 TheMealDB、DummyJSON、Wikibooks 烹饪书和 Forkify（都不需要账号），以及 Spoonacular、Recipe API 和 Tasty（需要你自己的免费密钥，可选）；「自动」会按顺序尝试，某个来源失败、要求等待、免费额度用完或没有新内容时，暂时跳过并换下一个。菜谱内容是英文的。发送的内容：只向当前来源请求一个菜谱和它的照片，不包含你电脑上的任何信息；密钥放在请求头里，加密保存在本机。照片保存在本栅栏的数据文件里。
