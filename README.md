# 五行拍拍

这是一个以八字排盘与治愈向解读为核心的网站项目。

当前项目包含：

- 导入的 `bazi-skill` 规则与参考资料：`.claude/skills/bazi/`
- 网站页面：`index.html`、`calculator.html`
- 后端排盘入口：`server.py`
- 真排盘引擎：`bazi_engine.py`
- 历法引擎源码：`lunar-python-master/`

技能来源：

- <https://github.com/jinchenma94/bazi-skill>

## 本地打开

在项目根目录运行：

```bash
python server.py
```

然后打开：

- <http://127.0.0.1:8000>

## 局域网分享

如果想让同一网络下的手机或电脑访问：

```bash
$env:HOST="0.0.0.0"
python server.py
```

然后在其他设备打开：

`http://你的局域网IP:8000`

## 公网部署

最推荐的方式是：

- GitHub
- Render

项目里已经准备好部署文件：

- `render.yaml`
- `requirements.txt`
- `.python-version`

详细步骤请看：

- [DEPLOY.md](C:/Users/17590/OneDrive/Desktop/saibosuanming/DEPLOY.md)

## 当前网站能力

- 首页品牌展示
- 八字信息多步骤录入
- 直接输入四柱八字
- 真四柱排盘
- 大运与流年结果
- 十神、格局、五行分析
- 温柔解读与继续追问

## 引擎说明

当前排盘引擎位于：

- `bazi_engine.py`

它依赖 vendored 的 `lunar-python` 来计算：

- 年柱
- 月柱
- 日柱
- 时柱
- 节气切换
- 大运顺逆
- 起运时间
- 大运区间
