import './style.css';
import { icon } from './icons';
import { defaults, duration, LaunchScene } from './scene';
import type { SceneSettings } from './scene';

const app = document.querySelector<HTMLElement>('#app')!;
let settings: SceneSettings = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem('orbital-scene-v1') || '{}');
  for (const key of ['exposure', 'atmosphere', 'thrust'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) settings[key] = Math.max(key === 'exposure' ? 0.5 : 0, Math.min(key === 'exposure' ? 2 : 1, saved[key]));
  for (const key of ['bloom', 'stars'] as const) if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  if (['twilight', 'night', 'sunrise'].includes(saved.time)) settings.time = saved.time;
} catch { /* Invalid or unavailable storage uses the default scene. */ }

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="Orbital 首页"><span class="brand-icon">${icon('orbit')}</span><span>ORBITAL<span class="brand-caption">LAUNCH STUDIO</span></span></a>
    <div class="breadcrumbs"><span>工作空间</span>${icon('chevron')}<span class="current">ARES 发射计划</span><span class="project-pill">个人项目</span></div>
    <div class="top-actions"><span class="save-state">${icon('check')}<span id="save-label">已保存到本机</span></span><button class="button export-button" id="export-open">${icon('download')}<span>导出资产</span>${icon('down')}</button><div class="avatar" title="本地工作空间">O</div></div>
  </header>
  <div class="workspace">
    <nav class="rail" aria-label="工作区导航">
      <button class="rail-button active" data-tab="scene" aria-label="场景编辑器" title="场景编辑器">${icon('layers')}</button>
      <button class="rail-button" data-tab="assets" aria-label="资产库" title="资产库">${icon('box')}</button>
      <button class="rail-button" data-tab="cameras" aria-label="镜头预设" title="镜头预设">${icon('camera')}</button>
      <span class="rail-spacer"></span><button class="rail-button" id="help-open" aria-label="使用说明" title="使用说明">${icon('info')}</button><span class="rail-version">V.01</span>
    </nav>
    <aside class="sidebar">
      <div class="sidebar-heading"><h1 id="panel-title">场景</h1><span id="panel-label">SCENE 01</span></div>
      <div id="scene-panel" class="side-content">
        <div class="mission-card"><div class="mission-orbit"></div><div class="mission-rocket">${icon('rocket')}</div><span class="mission-id">MISSION / 001</span><strong>ARES–01</strong><span class="mission-caption">让想象，突破引力。</span><span class="mission-status"><i></i> 发射系统就绪</span></div>
        <section class="side-section"><div class="section-title"><h2>场景层级</h2><span>05</span></div>
          <div class="scene-tree">
            <button class="tree-row selected" data-object="rocket"><span class="tree-icon orange">${icon('rocket')}</span><span>ARES–01 火箭<small>主体 · 7 组推进器</small></span><span class="visibility" aria-label="隐藏火箭" role="switch" aria-checked="true" tabindex="0" data-visible="rocket">${icon('eye')}</span></button>
            <button class="tree-row" data-object="pad"><span class="tree-icon">${icon('layers')}</span><span>发射平台</span><span class="visibility" aria-label="隐藏发射平台" role="switch" aria-checked="true" tabindex="0" data-visible="pad">${icon('eye')}</span></button>
            <button class="tree-row" data-object="tower"><span class="tree-icon">${icon('box')}</span><span>服务塔架</span><span class="visibility" aria-label="隐藏服务塔架" role="switch" aria-checked="true" tabindex="0" data-visible="tower">${icon('eye')}</span></button>
            <button class="tree-row" data-object="stars"><span class="tree-icon">${icon('globe')}</span><span>星空环境</span><span class="visibility" aria-label="隐藏星空" role="switch" aria-checked="${settings.stars}" tabindex="0" data-visible="stars">${icon(settings.stars ? 'eye' : 'eyeoff')}</span></button>
            <button class="tree-row" data-object="effects"><span class="tree-icon">${icon('wind')}</span><span>大气与尾焰</span><span class="visibility" aria-label="隐藏大气与尾焰" role="switch" aria-checked="true" tabindex="0" data-visible="effects">${icon('eye')}</span></button>
          </div>
        </section>
        <section class="side-section environment-section"><div class="section-title"><h2>环境与光照</h2>${icon('sun')}</div>
          <label class="field-caption">时段预设<span>TIME OF DAY</span></label><div class="segmented" role="group" aria-label="时段预设"><button data-time="twilight" class="${settings.time === 'twilight' ? 'active' : ''}">暮光</button><button data-time="night" class="${settings.time === 'night' ? 'active' : ''}">深夜</button><button data-time="sunrise" class="${settings.time === 'sunrise' ? 'active' : ''}">日出</button></div>
          <div class="range-field"><label for="exposure">曝光强度</label><output id="exposure-value">${settings.exposure.toFixed(2)}</output><input id="exposure" type="range" min="0.5" max="2" step="0.01" value="${settings.exposure}" /></div>
          <div class="range-field"><label for="atmosphere">大气浓度</label><output id="atmosphere-value">${Math.round(settings.atmosphere * 100)}%</output><input id="atmosphere" type="range" min="0" max="1" step="0.01" value="${settings.atmosphere}" /></div>
          <div class="range-field"><label for="thrust">推进器强度</label><output id="thrust-value">${Math.round(settings.thrust * 100)}%</output><input id="thrust" type="range" min="0" max="1" step="0.01" value="${settings.thrust}" /></div>
          <div class="toggle-row"><span>电影辉光 <small>BLOOM</small></span><button id="bloom-toggle" class="switch ${settings.bloom ? 'on' : ''}" role="switch" aria-checked="${settings.bloom}" aria-label="电影辉光"><span></span></button></div>
        </section>
        <section class="side-section material-section"><div class="section-title"><h2>材质样本</h2><span>PBR</span></div><div class="material-swatches"><button data-material="metal"><span class="swatch metal"></span><span>拉丝金属</span></button><button data-material="heat"><span class="swatch heat"></span><span>烧蚀涂层</span></button><button data-material="engine"><span class="swatch engine"></span><span>发光尾焰</span></button></div></section>
      </div>
      <div id="assets-panel" class="side-content alternate-panel" hidden><p class="panel-description">每一处细节，皆可继续创作。<br>导出后可在 Blender 等软件中编辑。</p><button class="asset-card" data-export="rocket">${icon('rocket')}<strong>ARES–01 火箭</strong><span>7 引擎 · 标准 PBR 材质</span><small>导出 .GLB ${icon('download')}</small></button><button class="asset-card" data-export="scene">${icon('layers')}<strong>完整发射场</strong><span>火箭 / 塔架 / 平台 / 地面</span><small>导出 .GLB ${icon('download')}</small></button><div class="asset-note">${icon('info')}<p>程序化纹理内嵌于资产。大气、粒子与电影后期保留在场景源代码中。</p></div></div>
      <div id="cameras-panel" class="side-content alternate-panel" hidden><p class="panel-description">找到属于这次任务的镜头。</p>${[['hero', '01', '电影主视角', '35mm · THREE-QUARTER'], ['wide', '02', '发射场全景', '35mm · ESTABLISHING'], ['engine', '03', '引擎特写', '35mm · DETAIL'], ['top', '04', '高空俯瞰', '35mm · AERIAL']].map(([v, n, t, s]) => `<button class="camera-card" data-camera="${v}"><span>${n}</span><strong>${t}<small>${s}</small></strong>${icon('arrow')}</button>`).join('')}</div>
      <div class="sidebar-footer"><span class="status-dot"></span><span>场景运行中</span><span class="footer-engine">THREE.JS</span></div>
    </aside>
    <main class="main-stage">
      <div class="viewport" id="viewport">
        <div id="scene-canvas"></div>
        <div class="viewport-shade"></div>
        <div class="scene-title"><div class="overline"><span class="orange-line"></span> THE NEXT FRONTIER</div><h2>ARES–01<span>®</span></h2><p>每一次点火，都是对未知的回答。</p><div class="scene-tags"><span>可重复使用运载火箭</span><span>01 / ORBITAL CLASS</span></div></div>
        <div class="viewport-top-right"><span class="live-label"><i></i> LIVE VIEW</span><button id="fullscreen" class="icon-button" aria-label="全屏场景" title="全屏场景">${icon('expand')}</button></div>
        <div class="render-status"><span class="tiny-square"></span><span>实时渲染</span><span class="render-separator">/</span><span>PBR · HDR</span></div>
        <div class="telemetry"><div class="telemetry-heading"><span class="status-dot"></span> FLIGHT SYSTEMS<span>01</span></div><div class="telemetry-row"><span>任务状态</span><strong id="flight-state">待命就绪</strong></div><div class="telemetry-row"><span>模拟高度</span><strong><span id="altitude">0.0</span><small> m</small></strong></div><div class="telemetry-row"><span>引擎阵列</span><strong>07 <small>/ ONLINE</small></strong></div><div class="signal-bars">${Array.from({ length: 24 }, (_, i) => `<i style="--bar:${30 + ((i * 17 + 11) % 63)}%"></i>`).join('')}</div><div class="telemetry-foot">SIMULATION <span id="sim-time">T − 00:07</span></div></div>
        <div class="location-label"><span class="location-cross">+</span><div>KENNEDY SPACE CENTER<span>LC–39A <i>28°36′08.0″N &nbsp; 80°36′15.0″W</i></span></div></div>
        <div class="viewport-bottom"><div class="camera-control"><span class="camera-label">${icon('camera')}</span><select id="camera-select" aria-label="选择镜头"><option value="hero">电影主视角</option><option value="wide">发射场全景</option><option value="engine">引擎特写</option><option value="top">高空俯瞰</option></select></div><div class="viewport-tools" role="toolbar" aria-label="视角控制"><button class="tool active" id="orbit-mode" title="环绕视角 · 鼠标拖动" aria-label="环绕视角">${icon('orbit')}</button><button class="tool" id="pan-mode" title="平移视角" aria-label="平移视角">${icon('hand')}</button><span class="tool-divider"></span><button class="tool" id="auto-orbit" title="自动 360° 环绕" aria-label="自动 360° 环绕" aria-pressed="false">${icon('rotate')}</button><button class="tool" id="reset-view" title="重置视角 · R" aria-label="重置视角">${icon('target')}</button><span class="tool-divider"></span><button class="tool" id="screenshot" title="保存当前画面" aria-label="保存当前画面">${icon('camera')}</button></div><span class="navigation-hint">拖动旋转 <span>·</span> 滚轮缩放</span></div>
        <div class="loading" id="loading"><span class="loader"></span><strong>正在构建发射场</strong><span>点亮下一片星空…</span></div>
        <div class="toast" id="toast" role="status"></div>
      </div>
      <section class="timeline-panel" aria-label="发射动画时间线"><div class="playback-controls"><button id="play" class="play-button" aria-label="播放发射动画">${icon('play')}</button><button id="restart" class="icon-button" aria-label="重置发射动画" title="重置发射动画">${icon('reset')}</button></div><div class="timeline-main"><div class="timeline-label"><span>发射序列 <small>LAUNCH SEQUENCE</small></span><span class="timecode"><b id="current-time">00:00</b><span> / 00:32</span></span></div><div class="timeline-track"><div class="timeline-markers"><i></i><i></i><i></i><i></i><i></i></div><input type="range" id="timeline" min="0" max="32" step="0.01" value="0" aria-label="发射动画进度" /></div><div class="timeline-ticks"><span>00s</span><span>08s</span><span>16s</span><span>24s</span><span>32s</span></div></div><div class="sequence-status"><span class="status-dot"></span><span id="sequence-label">准备点火</span><small>SPACE 播放 / 暂停</small></div></section>
      <footer class="stage-footer"><span><i></i> WEBGL 2.0 <b id="fps">60 FPS</b></span><span id="mesh-count">程序化 3D 场景</span><span>为探索而造 <span class="footer-plus">+</span></span></footer>
    </main>
  </div>
  <dialog id="export-dialog"><form method="dialog" class="dialog-close-form"><button class="icon-button" aria-label="关闭导出">${icon('close')}</button></form><div class="dialog-eyebrow">READY FOR YOUR NEXT CREATION</div><h2>让创作，继续。</h2><p class="dialog-description">导出包含层级、网格和纹理的可编辑 3D 资产。<br>可直接导入 Blender、Cinema 4D 或其他 glTF 工具。</p><label class="export-option"><input type="radio" name="export-scope" value="scene" checked /><span>${icon('layers')}<strong>完整发射场<small>火箭、发射台、塔架与地面设施</small></strong></span><b>.GLB</b></label><label class="export-option"><input type="radio" name="export-scope" value="rocket" /><span>${icon('rocket')}<strong>仅火箭主体<small>ARES–01、七引擎阵列与内嵌材质</small></strong></span><b>.GLB</b></label><div class="export-note">${icon('info')}<span>包含标准 PBR 材质。动态烟雾、尾焰与电影后期由 Three.js 源码提供。</span></div><button class="button dialog-primary" id="export-confirm">${icon('download')} 导出 GLB 资产</button><button class="text-button" id="export-settings">保存场景配置 .JSON ${icon('arrow')}</button></dialog>
  <dialog id="info-dialog"><form method="dialog" class="dialog-close-form"><button class="icon-button" aria-label="关闭说明">${icon('close')}</button></form><div id="info-content"></div></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = (s: string) => document.querySelectorAll<HTMLElement>(s);
let scene: LaunchScene;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
function save() {
  try { localStorage.setItem('orbital-scene-v1', JSON.stringify(scene.settings)); $('#save-label').textContent = '已保存到本机'; }
  catch { $('#save-label').textContent = '本次会话'; }
}
function download(data: Blob | string, name: string) {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function showInfo(eyebrow: string, title: string, content: string) { $('#info-content').innerHTML = `<div class="dialog-eyebrow">${eyebrow}</div><h2>${title}</h2>${content}`; $('#info-dialog') instanceof HTMLDialogElement && ($('#info-dialog') as HTMLDialogElement).showModal(); }
function updateRange(input: HTMLInputElement) { input.style.setProperty('--value', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`); }
$$('input[type="range"]').forEach(el => updateRange(el as HTMLInputElement));

function setCamera(value: string) {
  scene.setView(value); $<HTMLSelectElement>('#camera-select').value = value;
  $('#auto-orbit').classList.remove('active'); $('#auto-orbit').setAttribute('aria-pressed', 'false');
  $$('.camera-card').forEach(el => el.classList.toggle('selected', el.dataset.camera === value));
}

async function exportAsset(onlyRocket = false) {
  const button = $('#export-confirm') as HTMLButtonElement;
  button.disabled = true; button.innerHTML = '<span class="button-spinner"></span> 正在打包网格与纹理…';
  toast('正在生成可编辑 3D 资产…');
  try {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));
    const data = await scene.exportGLB(onlyRocket);
    download(new Blob([data], { type: 'model/gltf-binary' }), onlyRocket ? 'ARES-01-rocket.glb' : 'ARES-01-launch-complex.glb');
    ($('#export-dialog') as HTMLDialogElement).close(); toast(`资产已导出 · ${(data.byteLength / 1024 / 1024).toFixed(1)} MB`);
  } catch (error) { console.error(error); toast('导出未完成，请重试。'); }
  finally { button.disabled = false; button.innerHTML = `${icon('download')} 导出 GLB 资产`; }
}

try {
  scene = new LaunchScene($('#scene-canvas'), settings);
  requestAnimationFrame(() => { $('#loading').classList.add('loaded'); setTimeout(() => $('#loading').remove(), 600); });
  let count = 0; scene.assets.traverse(o => { if (o.type === 'Mesh' || o.type === 'InstancedMesh') count++; });
  $('#mesh-count').textContent = `${count} 个可编辑网格 · PBR 材质`;
  let lastUi = 0;
  scene.onFrame = (time, fps) => {
    const now = performance.now(); if (now - lastUi < 120) return; lastUi = now;
    ($('#timeline') as HTMLInputElement).value = String(time); updateRange($('#timeline'));
    $('#current-time').textContent = '00:' + Math.floor(time).toString().padStart(2, '0');
    $('#fps').textContent = `${Math.min(240, Math.round(fps))} FPS`;
    $('#altitude').textContent = scene.rocket.position.y.toFixed(1);
    $('#flight-state').textContent = time === 0 ? '待命就绪' : time < 7 ? '主引擎点火' : time < 16 ? '离台起飞' : time < 32 ? '稳定爬升' : '序列完成';
    $('#sequence-label').textContent = time === 0 ? '准备点火' : time < 7 ? '点火阶段' : time < 16 ? '离台起飞' : time < 32 ? '上升阶段' : '序列完成';
    const t = Math.abs(time - 7); $('#sim-time').textContent = `T ${time < 7 ? '−' : '+'} 00:${Math.floor(t).toString().padStart(2, '0')}`;
    $('#play').innerHTML = icon(scene.playing ? 'pause' : 'play'); $('#play').setAttribute('aria-label', scene.playing ? '暂停发射动画' : '播放发射动画');
  };

  for (const key of ['exposure', 'atmosphere', 'thrust'] as const) {
    $(`#${key}`).addEventListener('input', e => { const input = e.target as HTMLInputElement; const n = Number(input.value); scene.settings[key] = n; $(`#${key}-value`).textContent = key === 'exposure' ? n.toFixed(2) : `${Math.round(n * 100)}%`; updateRange(input); scene.applySettings(); save(); });
  }
  $$('[data-time]').forEach(el => el.addEventListener('click', () => { scene.settings.time = el.dataset.time as SceneSettings['time']; $$('[data-time]').forEach(b => b.classList.toggle('active', b === el)); scene.applySettings(); save(); }));
  $('#bloom-toggle').addEventListener('click', () => { scene.settings.bloom = !scene.settings.bloom; $('#bloom-toggle').classList.toggle('on', scene.settings.bloom); $('#bloom-toggle').setAttribute('aria-checked', String(scene.settings.bloom)); scene.applySettings(); save(); });
  $$('[data-tab]').forEach(el => el.addEventListener('click', () => {
    const name = el.dataset.tab!; $$('[data-tab]').forEach(b => b.classList.toggle('active', b === el));
    for (const panel of ['scene', 'assets', 'cameras']) $(`#${panel}-panel`).hidden = panel !== name;
    $('#panel-title').textContent = { scene: '场景', assets: '资产库', cameras: '镜头' }[name]!;
    $('#panel-label').textContent = { scene: 'SCENE 01', assets: 'ASSET LIBRARY', cameras: 'CAMERA RIG' }[name]!;
  }));
  $$('[data-object]').forEach(el => el.addEventListener('click', () => { $$('[data-object]').forEach(b => b.classList.toggle('selected', b === el)); }));
  $$('[data-visible]').forEach(el => {
    const toggle = (e: Event) => {
      e.stopPropagation(); const key = el.dataset.visible!; let visible: boolean;
      if (key === 'stars') { scene.settings.stars = !scene.settings.stars; scene.applySettings(); save(); visible = scene.settings.stars; }
      else { const group = scene[key as 'rocket' | 'pad' | 'tower' | 'effects']; group.visible = !group.visible; visible = group.visible; }
      el.innerHTML = icon(visible ? 'eye' : 'eyeoff'); el.classList.toggle('is-hidden', !visible); el.setAttribute('aria-checked', String(visible)); el.setAttribute('aria-label', `${visible ? '隐藏' : '显示'}${{ rocket: '火箭', pad: '发射平台', tower: '服务塔架', stars: '星空', effects: '大气与尾焰' }[key]}`);
    };
    el.addEventListener('click', toggle); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  });
  $('#camera-select').addEventListener('change', e => setCamera((e.target as HTMLSelectElement).value));
  $$('[data-camera]').forEach(el => el.addEventListener('click', () => setCamera(el.dataset.camera!)));
  $('#orbit-mode').addEventListener('click', () => { scene.controls.mouseButtons.LEFT = 0; $('#orbit-mode').classList.add('active'); $('#pan-mode').classList.remove('active'); });
  $('#pan-mode').addEventListener('click', () => { scene.controls.mouseButtons.LEFT = 2; $('#pan-mode').classList.add('active'); $('#orbit-mode').classList.remove('active'); });
  $('#auto-orbit').addEventListener('click', () => { scene.autoOrbit = !scene.autoOrbit; $('#auto-orbit').classList.toggle('active', scene.autoOrbit); $('#auto-orbit').setAttribute('aria-pressed', String(scene.autoOrbit)); });
  $('#reset-view').addEventListener('click', () => setCamera('hero'));
  $('#screenshot').addEventListener('click', () => { download(scene.screenshot(), 'ARES-01-cinematic.png'); toast('当前画面已保存为 PNG'); });
  $('#fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#viewport').requestFullscreen(); }
    catch { toast('当前浏览器不支持全屏，请放大窗口查看。'); }
  });
  const togglePlay = () => { if (scene.elapsed >= duration) { scene.seek(0); setCamera('hero'); } scene.playing = !scene.playing; };
  $('#play').addEventListener('click', togglePlay);
  $('#restart').addEventListener('click', () => { scene.playing = false; scene.seek(0); setCamera('hero'); });
  $('#timeline').addEventListener('input', e => { scene.seek(Number((e.target as HTMLInputElement).value)); updateRange(e.target as HTMLInputElement); });
  document.addEventListener('keydown', e => { if ((e.target as HTMLElement).matches('input,select,button,[role="switch"]') || document.querySelector('dialog[open]')) return; if (e.code === 'Space') { e.preventDefault(); togglePlay(); } if (e.code === 'KeyR') setCamera('hero'); });
  $('#export-open').addEventListener('click', () => ($('#export-dialog') as HTMLDialogElement).showModal());
  $('#export-confirm').addEventListener('click', () => exportAsset(($('input[name="export-scope"]:checked') as HTMLInputElement).value === 'rocket'));
  $$('[data-export]').forEach(el => el.addEventListener('click', () => exportAsset(el.dataset.export === 'rocket')));
  $('#export-settings').addEventListener('click', () => { download(new Blob([JSON.stringify({ schema: 'orbital-scene-v1', settings: scene.settings, camera: { position: scene.camera.position.toArray(), target: scene.controls.target.toArray() } }, null, 2)], { type: 'application/json' }), 'ARES-01-scene-settings.json'); toast('场景配置已保存'); });
  const materialInfo: Record<string, string[]> = {
    metal: ['BRUSHED METAL', '拉丝金属', '微细横向拉丝、面板拼缝与铆钉共同构成火箭主体表面。采用物理材质及各向异性反射，在不同光照和视角下呈现细腻的金属高光。', '金属度 0.78', '粗糙度 0.33', '程序化纹理 1024 × 1024'],
    heat: ['ABLATIVE COATING', '烧蚀涂层', '由独立陶瓷块、表面颗粒及沿引擎方向渐变的烟熏痕迹构成。深色涂层用于引擎裙部、级间段和稳定翼。', '金属度 0.45', '粗糙度 0.70', '程序化纹理 512 × 1024'],
    engine: ['EMISSIVE PROPULSION', '发光推进器', '七台发动机配有独立喷管、冷却环和发光燃烧室。动态尾焰采用着色器，并由点光源照亮发射台与周围结构。', '七引擎阵列', '可调推力与辉光', 'GLB 包含静态发光燃烧室'],
  };
  $$('[data-material]').forEach(el => el.addEventListener('click', () => { const m = materialInfo[el.dataset.material!]; showInfo(m[0], m[1], `<p class="dialog-description">${m[2]}</p><div class="info-facts">${m.slice(3).map(s => `<span>${icon('check')}${s}</span>`).join('')}</div>`); }));
  $('#help-open').addEventListener('click', () => showInfo('ORBITAL / QUICK START', '探索，从这里开始。', '<p class="dialog-description">用鼠标拖动场景来 360° 环绕查看，滚轮缩放，右键拖动平移。也可通过下方工具栏切换平移模式或自动环绕。</p><div class="help-shortcuts"><span>播放 / 暂停发射动画 <kbd>Space</kbd></span><span>恢复电影主视角 <kbd>R</kbd></span><span>退出全屏或对话框 <kbd>Esc</kbd></span></div><p class="dialog-description">左侧可调节环境光照、尾焰强度与物体可见性。右上角导出可编辑 GLB；材质纹理无需联网加载。场景为艺术化任务模拟，高度单位为米。</p>'));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) (dialog as HTMLDialogElement).close(); } }));
  window.addEventListener('pagehide', () => scene.dispose(), { once: true });
} catch (error) {
  console.error(error);
  $('#loading').innerHTML = '<strong>3D 场景未能启动</strong><span>请启用浏览器硬件加速或使用支持 WebGL 2 的浏览器。</span><button class="button" id="reload">重新加载</button>';
  $('#reload').addEventListener('click', () => location.reload());
}
