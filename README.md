# 自律代币局（PWA）

一个可在电脑和 iPhone 使用的自律激励应用：
- 每日打卡获得代币
- 普通盲盒（含紫/金保底）
- 周盲盒（整周全勤解锁，提供未来周收益倍率）
- 代币商店兑换

## 本地运行（静态网页版）

在项目目录执行：

```bash
python3 -m http.server 8080
```

然后打开：
- 电脑：`http://localhost:8080`
- iPhone（同一局域网）：`http://你的电脑局域网IP:8080`

## 本地运行（Streamlit 版）

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 部署到 Streamlit Community Cloud

1. 把本项目上传到你的 GitHub 仓库。
2. 打开 [Streamlit Community Cloud](https://share.streamlit.io/) 并登录。
3. 点击 `New app`，选择你的仓库与分支。
4. `Main file path` 填：`streamlit_app.py`
5. 点击 `Deploy`。
6. 部署完成后，你会获得一个公开链接，可直接在电脑和 iPhone 上使用。

### 数据说明（Streamlit Cloud）

- 已支持 **Supabase 持久化**（推荐）。
- 若未配置 Supabase，会回退到本地 `data/state.json`。
- Streamlit Cloud 的本地文件系统非永久，容器重建后可能丢失。

### 配置 Supabase（推荐）

1. 在 Supabase 执行建表 SQL：

```sql
create table if not exists discipline_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz default now()
);
```

2. 在 Streamlit Cloud -> `Settings -> Secrets` 填写：

```toml
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_TABLE="discipline_state" # 可选，默认就是这个
APP_STATE_ID="default"            # 可选，用于区分不同用户数据
```

3. 重新部署后，应用会自动切到 Supabase 云端持久化。

## iPhone 安装为“App”

1. 用 Safari 打开页面。
2. 点击分享按钮。
3. 选择“添加到主屏幕”。
4. 之后可像 App 一样从桌面打开。

## 规则说明

### 每日打卡奖励
- 23:00 前入睡：40
- 饮食健康：40
- 英语输出练习（>10分钟）：30
- 硬核技术/算法钻研（>30分钟）：30
- 作品集/自比应用更新（>10行有效代码）：30
- 运动（>20分钟）：20
- 耐心练习：10

### 普通盲盒（200 代币）
- 白盒：70%，奖励 160
- 蓝盒：20%，奖励 240
- 紫盒：9%，奖励 700
- 金盒：1%，奖励 4000

#### 保底机制
- `purple_counter`：开出白/蓝 +1，开出紫/金重置。
  - 当连续未出紫达到 10 次后，从第 11 次开始每次额外 +10% 紫概率。
- `gold_counter`：每次未出金 +1，开出金重置。
  - 当连续未出金达到 60 次后，从第 61 次开始每次额外 +2% 金概率。

> 当紫/金保底叠加导致总概率超过 100% 时，系统会自动压缩白/蓝概率，保证总和为 100%。

### 每周盲盒
- 条件：某一整周（周一到周日）7 天全部项目都完成。
- 开启后结果：
  - 普通（70%）：未来加成周收益 x1.05
  - 稀有（20%）：未来加成周收益 x1.2
  - 史诗（9%）：未来加成周收益 x1.5
  - 传说（1%）：未来加成周收益 x2

### 代币商店
- 娱乐消遣类：游戏权限按当日累计阶梯计价（30 / 100 / 300+）
- 口腹之欲类：冰淇淋、烤肉/炸鸡、黑珍珠、米其林三星
- 硬核资产类：Switch2、AirPods Max2、iPad Pro 13、旅行兑换

## 数据

- 数据保存在浏览器 `localStorage`。
- 应用内支持“导出数据 / 导入数据 / 重置数据”。
