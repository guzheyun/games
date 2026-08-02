# 游戏合集

## 游戏列表

### 俄罗斯方块 `/tetris/`
经典俄罗斯方块，支持单人/双人对战，速度递增，硬降后可调整位置，消除特效。

- 打开 `tetris/index.html` 即可游玩

### 竞技对战 `/arena/`
6角色4地图的2D格斗对战游戏，WebSocket联机，服务器权威架构。

- 启动服务器：`cd arena && python server.py`
- 打开 `arena/index.html` 进入游戏
- 账号：guzheyun / guyang，密码：12345

### 靶场射击 `/shooting/`
第一人称3D靶场射击训练（Three.js），含反射弧测试和排行榜。

- 打开 `shooting/index.html` 即可游玩

### 凌空羽毛球 `/badminton/`
2D 羽毛球对战，含三档机器人、高级球拍、一次性技能与永久技能商店、三种手动发球、21 分三局两胜规则，以及服务器权威的局域网真人匹配。

- 安装依赖：`pip install -r badminton/requirements.txt`
- 启动服务：`cd badminton && python server.py`
- 本机访问：`http://localhost:8082`
- 局域网访问：`http://服务器局域网IP:8082`
- 默认网页端口为 `8082`，WebSocket 端口为 `8766`；部署时需同时放行这两个 TCP 端口

### 魔尺工坊 `/magic-ruler/`
参照现实魔尺与公开几何资料制作的 3D 创作游戏：24 个错开半节的直角等腰三角棱柱、23 个斜轴关节；关节按 90° 步进旋转，支持从两端逐阶增减、左右分段控制、多条魔尺拼接和枪造型模板。

- 打开 `magic-ruler/index.html` 即可游玩，进度会自动保存在浏览器中
