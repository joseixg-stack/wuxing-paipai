# 五行拍拍部署指南

这份项目已经可以直接部署成一个公网网站。

## 现在已经准备好的内容

- 启动入口：`server.py`
- 首页：`index.html`
- 测算页：`calculator.html`
- 部署配置：`render.yaml`
- Python 版本：`.python-version`
- 忽略规则：`.gitignore`

## 最推荐的分享方式

`GitHub + Render`

这样做最省事，也最像正式网站。

---

## 第一步：上传到 GitHub

如果电脑里没有 `git`，也没关系，可以用下面两种方式。

### 方式 A：用 GitHub Desktop

1. 安装 GitHub Desktop  
   <https://desktop.github.com/>
2. 登录 GitHub 账号
3. 选择 `Add an Existing Repository from your Hard Drive`
4. 选中这个文件夹：

`C:\Users\17590\OneDrive\Desktop\saibosuanming`

5. 如果提示不是 Git 仓库，就点 `Create a repository`
6. 填仓库名，例如：

`wuxing-paipai`

7. 点击 `Publish repository`

### 方式 B：直接网页上传

1. 打开 GitHub，新建一个仓库
2. 仓库名可用：

`wuxing-paipai`

3. 建好后，点网页上的 `uploading an existing file`
4. 把这个项目文件夹里的内容拖进去

建议不要上传这些内容：

- `__pycache__`
- `stitch.zip`

---

## 第二步：部署到 Render

1. 打开 Render  
   <https://render.com/>
2. 登录后点击 `New +`
3. 选择 `Web Service`
4. 连接你的 GitHub 仓库
5. 选中刚刚上传的 `wuxing-paipai`
6. Render 会读取项目里的 `render.yaml`

这个项目当前的部署参数已经写好了：

- Runtime: Python
- Start Command: `python server.py`
- HOST: `0.0.0.0`

7. 点击部署
8. 等待完成后，Render 会给你一个公网网址

这样别人就能直接打开。

---

## 第三步：自己先检查一次

部署成功后，重点看这几个页面：

- 首页
- 测算页
- 输入生日后是否能正常出结果
- 模糊时段是否能正常排盘
- 结果页里的温柔解读是否正常显示

---

## 如果之后要绑定自己的域名

Render 支持自定义域名。  
等网站先正常跑起来，再去 Render 的域名设置里绑定即可。

---

## 当前要注意的一点

本地目录里有 `__pycache__`，但已经被 `.gitignore` 忽略，不影响上传和部署。  
如果网页上传时看到了它，直接不要选就可以。
