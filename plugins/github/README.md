# GitHub activity GitHub 仓库动态

The newest open issues (🟢), open pull requests (🔀) and commits (📝) of a GitHub repository, as
you choose, each list newest first. An issue or pull request shows its number and title, a commit
its short hash and the first line of its message; the tooltip says who made it and when. A click
on a row opens it in the browser, a click on a list's title opens that page of the repository
(`/issues`, `/pulls`, `/commits`), a click on the repository's name opens the repository, and a
click on the last row asks again.

Set these in the fence menu, Plugin settings:

- **Repository**: `owner/name` (a pasted `https://github.com/owner/name` address works too). The
  default is `DayuanJiang/PecoFence`.
- **Issues**, **Pull requests**, **Commits**: which lists show. Issues and pull requests are on and
  commits off by default, as before.
- **Branch of the commits**: the branch whose commits show; empty is the repository's default
  branch. A branch name is typed, GitHub's list of branches is not asked.
- **Rows per list**: how many issues, pull requests or commits each list shows, 1 to 20 (5 by
  default; another value is brought back into that range).

Each fence keeps its own settings.

The plugin does not sign in. GitHub answers 60 requests an hour from one network address without
signing in, so the plugin asks once when the fence first shows and then every 10 minutes while it
shows, one request for each list that is on, one after the other. When GitHub says to wait
(`Retry-After`, or `X-RateLimit-Remaining: 0` with the time the limit resets), it waits that long,
and a click waits too; a refusal without either waits 10 minutes. After you change a setting, it
asks 2 seconds later. When the first request fails, a click on the row that says so asks again.

What is sent: one request to `api.github.com` for each list that is on, such as
`https://api.github.com/repos/DayuanJiang/PecoFence/issues?state=open&per_page=20` (at least 20, as the pull requests among them are left out), `.../pulls?state=open&per_page=5`
and `.../commits?per_page=5&sha=main`. Like every web request it shows GitHub your network
address. Links open on `github.com` in your browser. Nothing else leaves the computer.

---

一个 GitHub 仓库最新的、还没关闭的 issue（🟢）、PR（🔀）和提交（📝），想看哪些自己选，最新的在上面；
鼠标停留时显示是谁、哪天提的。点一行在浏览器里打开它，点列表标题打开仓库里对应的页面，点仓库名打开仓库，
点最后一行重新获取。在栅栏菜单的「插件设置」里写仓库 `owner/name`（也可以直接贴 github.com 的网址），
打开或关闭 issue、PR、提交，并可填提交所在的分支（留空是默认分支，分支名要自己输入）和每个列表显示的行数（1 到 20，默认 5）。默认是
`DayuanJiang/PecoFence`，issue 和 PR 打开、提交关闭。不登录：GitHub 对一个网络地址每小时最多回答 60 次，
所以插件只在栅栏第一次显示时和之后每 10 分钟（栅栏显示时）问一次，每个打开的列表一个请求；GitHub 要求等待时就
等到它说的时间，点击也一样，没说等多久的拒绝等 10 分钟。改了设置后 2 秒再问。第一次没拿到时，点说明原因的那
一行可以重新获取。发送的内容：向 `api.github.com` 请求每个打开的列表，链接在浏览器里打开 `github.com`。
