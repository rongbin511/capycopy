# CapyCopy

试卷浏览与编辑。前端是 Nuxt 静态站，API 是跑在 Cloudflare Workers 上的 Python（FastAPI）。目录数据在 D1，试卷文件在 R2。

本地日常开发不走 Workers：API 直接读仓库里的 `papers/manifest.db` 和 `papers/` 文件。

## 环境

- Node.js 20+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- 部署到 Cloudflare 时还需要一个 Cloudflare 账号

## 本地开发

在仓库根目录安装依赖：

```bash
npm install
npm --prefix frontend install
uv sync
```

确认 `papers/manifest.db` 在仓库里（API 启动时会读它）。然后：

```bash
npm run dev
```

这会同时启动：

| 进程 | 地址 | 作用 |
| --- | --- | --- |
| API | http://127.0.0.1:8000 | FastAPI，`CAPYCOPY_LOCAL=1` |
| 网页 | http://127.0.0.1:3000 | Nuxt，把 `/api` 和 `/papers` 代理到 API |

浏览器打开 http://127.0.0.1:3000 。健康检查：http://127.0.0.1:8000/api/health 。

改试卷内容时直接改 `papers/` 下的文件，本地 API 会读这些路径。

## 部署到 Cloudflare

线上由一个 Worker 同时提供 API 和静态页面。配置在 `wrangler.jsonc`：

- Worker 名：`capycopy`（入口 `backend/main.py`）
- 静态资源：构建产物 `dist/`
- D1：`capycopy-db`（binding `DB`）
- R2：`capycopy-papers`（binding `BUCKET`）

`wrangler.jsonc` 里的 `database_id` 目前是占位符，创建数据库后要换成真实 ID，否则部署连不上 D1。

### 1. 登录并创建资源

```bash
npx wrangler login
npx wrangler d1 create capycopy-db
npx wrangler r2 bucket create capycopy-papers
```

把 `d1 create` 输出的 `database_id` 写进 `wrangler.jsonc` 的 `d1_databases[0].database_id`。

### 2. 写入目录数据（D1）

`migrations/0001_init.sql` 建表，`migrations/0002_seed.sql` 写入学校、科目、题型和试卷目录。

```bash
npx wrangler d1 migrations apply capycopy-db --remote
```

### 3. 上传试卷文件（R2）

`scripts/seed_r2.py` 会把 `papers/` 里的 json、图片等上传到 R2，并跳过 `.db` 和 `.pdf`。脚本默认带 `--local`，只进本地模拟的 R2。推到线上前，删掉脚本里的 `"--local",` 再执行：

```bash
uv run python scripts/seed_r2.py
```

对象 key 形如 `papers/<subject>/<paper_id>/paper.json`，和本地目录一致。

### 4. 构建并发布

```bash
npm run deploy
```

这一步会先用 Nuxt 生成静态站到 `dist/`，再执行 `pywrangler deploy`。终端会打印 Workers 地址，一般是 `https://capycopy.<你的子域>.workers.dev`。

之后改代码，重复 `npm run deploy` 即可。目录结构变了就再跑一次远程 migration；试卷文件变了就再跑一次 R2 上传。

## 可选：在本地跑 Workers

想按线上同一套 D1 + R2 在本机预览时：

```bash
npm run seed:d1
uv run python scripts/seed_r2.py
npm run dev:worker
```

`seed:d1` 只把 migration 应用到本地 D1。`seed_r2.py` 保持 `--local` 时，文件进本地 R2。`dev:worker` 会先构建前端，再用 Wrangler 起 Worker。

日常改界面或 API，用上面的 `npm run dev` 更快，不用每次构建静态站。
