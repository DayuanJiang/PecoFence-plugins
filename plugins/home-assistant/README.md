# Home Assistant

Shows the sensors, lights and switches of your [Home Assistant](https://www.home-assistant.io) on
the local network: a sensor with its value, a light or switch as a button that turns it on or off.
The states are read every 30 seconds and after each click.

Set it up in the fence's 插件设置 (Plugin settings):

1. *Home Assistant address*: the address of the computer it runs on, such as `192.168.1.20` or
   `homeassistant.local` (an address copied from the browser, `http://192.168.1.20:8123/`, works
   too).
2. *Long-lived access token*: make one in Home Assistant under your profile, *Security*. PecoFence
   keeps it encrypted on this computer.
3. *Entities to show*: entity ids separated by commas, such as `light.desk, sensor.room_temperature`;
   empty shows the first 30.

- Permission: `local.lan` port 8123 (Home Assistant on the device whose address you typed). It
  reads the states (`/api/states`) and, when you click a button, asks Home Assistant to turn that
  light or switch on or off (`/api/services/homeassistant/toggle`), each time with your token.
  It connects only to that address, and to nothing on the internet.

---

显示局域网里 Home Assistant 的传感器、灯和开关：传感器显示读数，灯和开关是一个按钮，点一下就开或关。每 30 秒和每次点击后
重新读取。在栅栏的「插件设置」里填写：Home Assistant 的地址（例如 `192.168.1.20` 或 `homeassistant.local`，从浏览器复制的
`http://192.168.1.20:8123/` 也可以）；长期访问令牌（在 Home Assistant 的个人资料 › 安全 里创建，PecoFence 把它加密保存在
这台电脑上）；要显示的实体（用逗号分开，空着就显示前 30 个）。权限：`local.lan` 的 8123 端口（你填写的那台设备上的 Home
Assistant）。它读取状态（`/api/states`），你点按钮时请 Home Assistant 开关那盏灯或那个开关
（`/api/services/homeassistant/toggle`），每次都带着你的令牌。它只连接你填写的地址，不连接互联网。
