# ORBITAL · Launch Studio

可交互的 Three.js 火箭发射场景。包含 ARES–01 七引擎运载火箭、发射平台、服务塔架、地面设施、程序化星空、暮光大气、烟雾和尾焰。界面为中文，适配桌面与手机。

## 预览与生成说明

- 在线预览：[https://uling19.github.io/cinematic-rocket-launch/](https://uling19.github.io/cinematic-rocket-launch/)
- GitHub 仓库：[https://github.com/ULing19/cinematic-rocket-launch](https://github.com/ULing19/cinematic-rocket-launch)
- 生成说明：这是 **Ultrafast 下 6.1sol、极高推理强度的一句话直出** 结果。

## 本对话最早提示词

> 使用Three.js构建一个具有电影感、照片级写实效果和丰富纹理的3D火箭发射场景，包含细节丰富的火箭主体、发射台、背景星空与大气效果，材质需包含金属拉丝、烧蚀涂层、发光推进器，场景需支持360°视角查看，并输出可编辑的3D资产。

## 启动

需要 Node.js 20.19+ 或 22.12+，推荐 Node.js 24 LTS。

```powershell
npm.cmd ci
npm.cmd run dev
```

访问终端显示的本地地址。当前开发服务使用 http://127.0.0.1:5173。

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

如果 npm 官方源不可用，可使用 `npm.cmd ci --registry=https://registry.npmmirror.com`。

## 场景操作

| 操作 | 效果 |
| --- | --- |
| 鼠标左键拖动 / 单指拖动 | 360° 环绕 |
| 滚轮 / 双指缩放 | 拉近、拉远 |
| 鼠标右键拖动 / 平移工具 | 平移镜头 |
| 自动环绕按钮 | 连续环绕查看 |
| 镜头选择 | 主视角、全景、引擎特写、高空俯瞰 |
| 播放按钮 / Space | 播放、暂停 32 秒发射序列 |
| 拖动时间线 | 查看点火、离台、爬升的任意时刻 |
| 复位按钮 | 返回序列起点 |
| R / 对焦按钮 | 恢复当前高度的主视角 |
| 左侧环境面板 | 调节时段、曝光、大气、推进器强度、辉光 |
| 层级右侧眼睛图标 | 显示或隐藏对象 |
| 相机按钮 | 下载不含界面的 PNG 渲染图 |
| 右上角导出 | 完整场景 GLB、独立火箭 GLB、JSON 场景配置 |

环境参数自动保存在当前浏览器的 localStorage 中。加载失败或存储不可用时采用默认值。

## 已生成的可编辑资产

- [完整发射场](artifacts/ARES-01-launch-complex.glb)：火箭、平台、塔架、设施、地面，保留命名层级。
- [独立火箭](artifacts/ARES-01-rocket.glb)：129 个网格，七引擎阵列、稳定翼、外部线缆、铆钉及船体标记。
- [场景配置](artifacts/ARES-01-scene-settings.json)：环境参数及相机位置。
- [渲染图](artifacts/ARES-01-cinematic.png)：场景原始 PNG。
- [资产重新加载检查](artifacts/glb-validation.json)：GLTFLoader 的实际读取结果。

GLB 使用米作为单位，纹理内嵌，支持 Blender 的「文件 → 导入 → glTF 2.0」。导入后可分别选择并编辑命名对象、网格与材质。独立火箭约 38.8 米高，最大横向尺寸约 6.1 米。模型局部原点沿用场景坐标，喷口位于 y≈6.2 米处。

标准 GLB 包含基础色、金属度、粗糙度、法线纹理与静态发光燃烧室。实时烟雾、动态尾焰、方向性大气散射、辉光与镜头跟随由 Three.js 源码实现，属于应用运行时效果。JSON 为配置快照，当前界面提供导出，不提供导入。

## 源码结构

- `src/scene.ts`：程序化建模、命名对象层级、灯光、OrbitControls、动画、GLB 导出。
- `src/materials.ts`：拉丝金属、烧蚀陶瓷、混凝土、法线、贴花与烟雾纹理生成。
- `src/main.ts`：交互、时间线、相机预设、持久化、下载和对话框。
- `src/style.css`：响应式工作台布局。
- `src/icons.ts`：界面 SVG 图标。
- `public/fonts/`：本地字体，运行时无需请求字体服务。

纹理由 Canvas 确定性生成，无需下载模型、贴图或 HDRI。材质采用 Three.js 标准 PBR 与物理材质，PMREM 环境反射、冷暖方向光、软阴影、ACES 色调映射及 UnrealBloomPass。大气与尾焰使用独立着色器；烟雾使用透明精灵。发射时间线为艺术化运动模拟。

## 验证

通过 TypeScript 严格检查与 Vite 生产构建。使用真实 Chromium / WebGL 渲染检查桌面和 390×844 手机布局、镜头、环绕与平移、参数保存、隐藏与恢复对象、播放与拖动时间线、结束重播、PNG/JSON/GLB 下载、全屏与帮助对话框。两份 GLB 均通过独立 GLTFLoader 重新读取。具体记录见 [QA](artifacts/QA.md)。
