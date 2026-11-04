let bitePage=0,biteQuery='',biteScope='china',biteDetailId=null;
let biteHabitat='auto',biteFocusHour=6,biteSelectedFish='all';
const biteEvidenceSources={
 wujiang:{title:'乌江翘嘴作钓记录（2019，李通）',url:'https://www.diaoyur.com/a/2019/48508.html'},
 shuhe:{title:'沭河翘嘴晨口记录（2019，三天两头钓1886）',url:'https://www.diaoyur.com/a/2019/46849.html'},
 'winter-culter':{title:'简阳水库冬季翘嘴记录（2016，钓鱼郎x）',url:'https://m.diaoyu123.com/luyazhanbao/102574.html'},
 mandarin:{title:'鳜鱼作钓资料（路达人，2022）',url:'https://www.luremaster.cn/baike/guiyu.html'},
 'winter-mandarin':{title:'冬季基地软饵鳜鱼记录（2016，钓鱼郎x）',url:'https://m.diaoyu123.com/luyazhanbao/102423.html'},
 'snakehead-log':{title:'野河雷蛙标点记录（2019，有空甩几杆2608）',url:'https://www.diaoyur.com/a/2019/47063.html'},
 'snakehead-review':{title:'乌鳢种质研究综述（浙江海洋大学学报，2024）',url:'https://reef.cbpt.cnki.net/portal/journal/portal/client/paper/f6d5bbc916496f7f293a38ef3c1d7777'},
 'winter-seabass':{title:'湛江冬季夜钓海鲈记录（2016，钓鱼郎x）',url:'https://m.diaoyu123.com/luyazhanbao/102324.html'},
 'bass-log':{title:'威海水库鲈钓记录（2020，A---wxc）',url:'https://www.diaoyur.com/a/2020/57583.html'},
 'stream-log':{title:'七岔河马口作钓记录（2016，路亚小超人）',url:'https://m.diaoyu123.com/luyazhanbao/102861.html'}
};
function biteLocationType(){if(biteHabitat!=='auto')return biteHabitat;const p=weatherLocation();return ['river','lake','reservoir','pond','fresh'].includes(p.type)||p.name.includes('杭州')?'fresh':p.type==='sea'?'sea':selectedWaterLocation?'unknown':locationIndex===locs.findIndex(x=>x[0]==='杭州')?'fresh':'sea';}
function fishHourInputs(){
 const day=dateKey(dates[selected]),w=weatherDay(),habitat=biteLocationType();
 const mean=d=>Number.isFinite(d?.temperatureMin)&&Number.isFinite(d?.temperatureMax)?(d.temperatureMin+d.temperatureMax)/2:null;
 const dayMean=mean(w),previous=new Date(dates[selected]);previous.setDate(previous.getDate()-1);
 const previousMean=mean(freeWeather?.days.find(d=>d.date===dateKey(previous)));
 const dayChange=Number.isFinite(dayMean)&&Number.isFinite(previousMean)?dayMean-previousMean:null;
 return (freeWeather?.hours||[]).filter(h=>h.time.startsWith(day)).map(h=>({...h,habitat,sunrise:w?.sunrise,sunset:w?.sunset,dayMean,dayChange}));
}
function changeBitePage(delta){bitePage+=delta;biteDetailId=null;renderFishList();document.getElementById('fishLibrary').scrollIntoView({block:'start'});}
function setBiteHour(hour){biteFocusHour=Number(hour);bitePage=0;biteDetailId=null;const select=document.getElementById('biteHourSelect');if(select)select.value=String(biteFocusHour);renderFishList();}
function selectBiteDetail(id){biteDetailId=id;renderFishList();document.getElementById('fishDetail').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function fish3D(p){const cell=p.artIndex%15,col=cell%3,row=Math.floor(cell/3);return `<div class="fish3d species3d" data-fish="${p.id}" role="img" aria-label="${esc(p.name)}写实3D渲染插画" style="background-image:url('assets/fish-species-${Math.floor(p.artIndex/15)}.webp');background-position:${col*50}% ${row*25}%"></div>`;}
function fishDetail(row){
 if(!row)return '<p class="sub">没有匹配鱼种，请调整搜索或范围。</p>';
 const {profile:p,current,results,best}=row;
 return `<div class="fishdetailhead"><div><div class="eyebrow">SPECIES DETAIL</div><h2>${esc(p.name)}</h2><p class="sub">${esc(p.origin)} · ${p.habitat==='sea'?'海水':'淡水'} · ${esc(p.group)}</p></div><div class="bitescore"><strong>${current.score??'—'}</strong><span>${esc(current.label)}</span></div></div><p class="sub">${String(biteFocusHour).padStart(2,'0')}:00 · ${current.input?'本地天气规则自动计算':'等待当地天气'}</p><p class="fishapproach">${esc(p.tip)}</p><p class="sub">拟饵参考：${esc(p.bait)}</p><div class="bitehours" role="group" aria-label="${esc(p.name)}逐小时条件指数">${Array.from({length:24},(_,h)=>{const r=results.find(x=>Number(x.input.time.slice(11,13))===h),valid=Number.isFinite(r?.score);return `<button class="${valid?'':'na'}" style="height:${valid?Math.max(5,r.score*.65):5}px;opacity:${h===biteFocusHour?1:.55}" onclick="setBiteHour(${h})" aria-label="${h}时 ${r?.score??'暂无'}分" title="${h}:00 · ${r?.score??'无数据'}"></button>`;}).join('')}</div><div class="bitelegend"><span>00时</span><span>12时</span><span>23时</span></div>${best?`<p class="bestwindow">当日相对较好：${best.input.time.slice(11)} · ${best.score}分</p>`:''}<ul class="bitefactors">${current.reasons.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>${current.missing.length?`<p class="sub">缺少：${esc(current.missing.join('、'))}</p>`:''}<details><summary>作钓经验与来源</summary><p>${esc(p.evidence)}</p>${p.sourceIds.map(id=>{const s=biteEvidenceSources[id];return s?`<p><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)} ↗</a></p>`:'';}).join('')}<p>这些是公开经验和个案，并非标准化渔获数据。养殖、幼鱼研究只用于生态背景，不直接当作成鱼野钓开口阈值。</p></details><details><summary>指数依据与限制</summary><p>应用内计算：气温35%、风况20%、时段30%、天气现象5%、天气稳定性10%；有前一日预报时才计算稳定性，可选项缺失按可用项归一。按鱼种区分晨昏、弱光、日间与抛投条件；低温日内回暖保留白天搜索窗口。气温不是水温，经验转换的权重和阈值仍为待校准产品规则。为避免满分暗示，参考分最高85。</p><p>仅比较所选地点、日期和小时的天气条件，不代表当地有鱼或中鱼概率。气压、风向与降水概率只展示；潮流、水质、密度与标点需要现场核实。无需第三方指数接口或手填水温。</p></details><p class="sub">写实3D风格静态插图，非鉴定图。</p>`;
}
renderFishList=function(){
 const hours=fishHourInputs(),habitat=biteLocationType();
 const candidates=BiteModel.profiles.filter(p=>(biteScope==='all'||p.domestic||biteSelectedFish===p.id)&&(biteSelectedFish==='all'||p.id===biteSelectedFish)&&(!biteQuery||[p.name,p.group,...p.aliases].some(v=>v.includes(biteQuery))));
 const ranked=BiteModel.rank(candidates,hours,biteFocusHour);
 bitePage=Math.max(0,Math.min(bitePage,Math.ceil(ranked.length/12)-1));
 const rows=ranked.slice(bitePage*12,bitePage*12+12);
 if(!rows.some(r=>r.profile.id===biteDetailId))biteDetailId=rows[0]?.profile.id||null;
 document.getElementById('fishCount').textContent=`${fmt(dates[selected])} · ${weatherLocation().name} · ${String(biteFocusHour).padStart(2,'0')}:00 · ${habitat==='fresh'?'淡水':habitat==='sea'?'海水':'请确认水域'} · ${ranked.length}条候选 · 指数从高到低，无数据置后`;
 document.getElementById('fishLibrary').innerHTML=rows.map((r,i)=>{const p=r.profile,score=r.current.score,position=bitePage*12+i+1;return `<article class="bitecard fishcompact" data-fish-id="${p.id}" data-score="${score??''}" data-rank="${position}"><button class="fishpick" onclick="selectBiteDetail('${p.id}')" aria-label="${esc(p.name)} ${score===null?'暂无指数':score+'分'} 查看详情" aria-pressed="${biteDetailId===p.id}"><span class="fishrank">${position}</span>${fish3D(p)}<h2>${esc(p.name)}</h2><span class="fishscore">${score??'—'}<small>${score===null?'待判断':'分'}</small></span></button></article>`;}).join('')||'<p class="sub">未找到鱼种，请缩短名称或切换范围。</p>';
 const pager=document.getElementById('fishPager');pager.innerHTML=ranked.length>12?`<button class="pill" onclick="changeBitePage(-1)" ${bitePage===0?'disabled':''}>上一页</button><span>第${bitePage+1}/${Math.ceil(ranked.length/12)}页</span><button class="pill" onclick="changeBitePage(1)" ${bitePage+1>=Math.ceil(ranked.length/12)?'disabled':''}>下一页</button>`:'';
 document.getElementById('fishDetail').innerHTML=fishDetail(rows.find(r=>r.profile.id===biteDetailId));
};
renderFish=function(){document.getElementById('fish').innerHTML=`<div class="heading"><div><div class="eyebrow">CHINA LURE · WEATHER RANKING</div><h1>这一刻，先钓哪种鱼？</h1><p class="sub">按当地天气与鱼种经验排序。点鱼看详情，切换时段会重新排名。</p></div><button class="pill" onclick="switchPage('home')">切换日期 ↗</button></div><label class="fishsearch">搜索鱼种或俗名<input aria-label="搜索鱼种或类群" placeholder="翘嘴、桂鱼、黑鱼、马口…" value="${esc(biteQuery)}" oninput="biteQuery=this.value.trim();bitePage=0;biteDetailId=null;renderFishList()"></label><div class="bitecontrols"><label>鱼种范围<select aria-label="鱼种范围" onchange="biteScope=this.value;bitePage=0;biteDetailId=null;renderFishList()"><option value="china" ${biteScope==='china'?'selected':''}>国内路亚候选</option><option value="all" ${biteScope==='all'?'selected':''}>完整鱼种库（含海外）</option></select></label><label>鱼种<select aria-label="鱼种" onchange="biteSelectedFish=this.value;bitePage=0;biteDetailId=null;renderFishList()"><option value="all">全部鱼种</option>${BiteModel.profiles.map(p=>`<option value="${p.id}" ${biteSelectedFish===p.id?'selected':''}>${p.name}</option>`).join('')}</select></label><label>水域类型<select aria-label="水域类型" onchange="biteHabitat=this.value;bitePage=0;biteDetailId=null;renderFishList()"><option value="auto" ${biteHabitat==='auto'?'selected':''}>按所选位置</option><option value="fresh" ${biteHabitat==='fresh'?'selected':''}>淡水</option><option value="sea" ${biteHabitat==='sea'?'selected':''}>海水</option></select></label><label>比较时段<select id="biteHourSelect" aria-label="比较时段" onchange="setBiteHour(this.value)">${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===biteFocusHour?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select></label></div><p id="fishCount" class="sub" aria-live="polite"></p><div id="fishLibrary" class="bitegrid" aria-label="鱼种指数降序列表"></div><div id="fishPager" class="fishpager"></div><section id="fishDetail" class="fishdetail card cardpad" aria-label="鱼种详情"></section><p class="sub">默认展示国内路亚候选，含大口黑鲈等引入对象；完整库保留97条记录。候选不是当地物种名录。天气参考规则0.4，经验个案未用于训练概率模型。</p>`;renderFishList();};
const biteForecastViews=renderForecastViews;renderForecastViews=function(){biteForecastViews();if(page==='fish'&&document.getElementById('fishLibrary'))renderFishList();};
navs[2][2]='钓鱼指数';renderNav();
