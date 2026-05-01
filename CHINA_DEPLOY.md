# 大陆访问优化说明

当前用户反馈的“打不开”更像是**部署区域和域名链路**问题，不是命盘页面本身的问题。

## 已经做好的代码层优化

- `server.py`
  - 新增 `/healthz`
  - API 增加 `OPTIONS` 支持
  - API 增加跨域头，允许前端单独挂到 CDN 或独立域名
  - 静态资源增加缓存头，HTML 维持 `no-cache`
- `static/calculator.js`
  - 支持通过运行时配置切换 API 域名
- `static/runtime-config.js`
  - 预留按域名映射 API 的配置
- `render.yaml`
  - 新增 `region: singapore`
  - 新增 `healthCheckPath: /healthz`

## 更适合大陆与海外同时访问的上线方式

### 方案 A：先快修

1. 新建一个 **新加坡区** Render Web Service，作为 API 服务
2. 把当前前端静态页挂到：
   - Render Static Site，或
   - 自定义域名 + CDN
3. 在 `static/runtime-config.js` 里把：

```js
window.__WXP_CONFIG__ = {
  apiBase: "https://你的-api-域名",
};
```

填成真实 API 地址。

### 方案 B：正式版

适合中国大陆和海外都要更稳：

1. 购买自定义域名
2. 前端走 CDN
3. API 放新加坡或香港
4. 如果要追求大陆更稳，再补：
   - ICP 备案
   - 大陆节点或大陆云厂商

## 当前限制

如果继续使用旧的 `onrender.com` 默认域名，并且服务还在美国区，就算前端代码改好了，大陆用户依然可能慢、偶发打不开、或首开超时。
