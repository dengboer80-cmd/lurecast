/* Experimental family defaults: product parameters awaiting field calibration.
   Includes occasional lure catches and overseas managed-fishery species.
   This catalogue does not assert local presence, taxonomy uniqueness or completeness. */
(function(){
 const old=new Map(BiteModel.profiles.map(p=>[p.name,p]));
 const groups=[
  [0,5,'warm','twilight','鲌类'],[6,9,'warm','twilight','鳜类'],[10,12,'warm','twilight','鳢类'],
  [13,15,'warm','twilight','黑鲈类'],[16,20,'temperate','twilight','溪流及鲤科鱼'],[21,23,'warm','twilight','鲶类'],
  [24,26,'warm','daylight','杂食鲤科鱼（偶然路亚对象）'],[27,28,'tropical','daylight','罗非鱼'],[29,30,'warm','twilight','太阳鱼科'],
  [31,34,'cool','twilight','冷水鲑鳟'],[35,36,'cool','twilight','狗鱼'],[37,39,'cool','twilight','鲈形冷温水鱼'],[40,40,'cool','twilight','哲罗鲑'],
  [41,44,'tropical','twilight','热带淡水掠食鱼'],[45,46,'temperate','twilight','海鲈'],[47,47,'tropical','twilight','尖吻鲈'],
  [48,49,'warm','twilight','笛鲷'],[50,53,'warm','twilight','石斑鱼'],[54,57,'temperate','daylight','鲷类'],
  [58,61,'cool','twilight','冷温水礁栖鱼'],[62,64,'temperate','twilight','底栖掠食鱼'],[65,65,'warm','daylight','鲻鱼（偶然路亚对象）'],
  [66,68,'warm','twilight','小型鲹类'],[69,72,'tropical','twilight','大型鲹及军曹鱼'],[73,74,'tropical','twilight','海鲢'],
  [75,75,'warm','twilight','海鳗'],[76,76,'temperate','twilight','鲆类'],[77,78,'warm','twilight','马鲛'],
  [79,79,'temperate','twilight','石首鱼'],[80,80,'warm','twilight','带鱼'],[81,82,'temperate','twilight','温水游泳鱼'],
  [83,88,'cool','twilight','洄游鲑鱼（水域需手选）'],[89,91,'warm','twilight','金枪鱼类'],[92,92,'tropical','daylight','鬼头刀'],
  [93,95,'warm','daylight','旗鱼类'],[96,96,'warm','twilight','梭鱼']
 ];
 BiteModel.profiles=fishCatalogue.map((f,i)=>{const g=groups.find(g=>i>=g[0]&&i<=g[1]);const base=old.get(f.name);return {...(base||{id:'fish-'+String(i).padStart(3,'0'),name:f.name,habitat:f.habitat==='淡水'?'fresh':'sea',climate:g[2],activity:g[3],bait:f.bait}),artIndex:i,group:g[4],parameterSource:base?'鱼种天气规则':'类群天气规则'};});
})();

/* China-focused candidate list. Presence at a selected coordinate is unverified.
   Supporting records and evidence limits: mobile/CHINA-FISHING-EVIDENCE-2026-11-04.md. */
(function(){
 const domestic=new Set('翘嘴鲌|青梢红鲌|蒙古鲌|红鳍原鲌|鳡|鳜|斑鳜|乌鳢|斑鳢|月鳢|大口黑鲈|马口鱼|宽鳍鱲|长鳍鱲|赤眼鳟|鲶|大口鲶|中国花鲈|尖吻鲈|红鳍笛鲷|斜带石斑鱼|赤点石斑鱼|青石斑鱼|鞍带石斑鱼|黑鲷|黄鳍鲷|真鲷|许氏平鲉|褐菖鲉|大泷六线鱼|斑头鱼|牙鲆|蓝圆鲹|竹荚鱼|军曹鱼|蓝点马鲛|康氏马鲛|白姑鱼|带鱼|日本鲭'.split('|'));
 const experience={
  culter:{aliases:['翘嘴','大白鱼'],activity:'twilight',style:'pelagic',evidence:'乌江、沭河晨口及冬季水库战报',sourceIds:['wujiang','shuhe','winter-culter'],tip:'晨昏先搜索饵鱼活动层；低温时减速，并分层试探，别只守表层。'},
  mandarin:{aliases:['桂鱼','桂花鱼'],activity:'lowlight',style:'bottom',evidence:'鳜鱼作钓资料及冬季基地战报',sourceIds:['mandarin','winter-mandarin'],tip:'围绕乱石、桥墩等结构贴底搜索；低温时增加停顿，白天也保留窗口。'},
  snakehead:{aliases:['黑鱼','乌鱼','雷强'],activity:'daylight',style:'cover',evidence:'野河雷蛙标点记录；研究仅用于生态背景',sourceIds:['snakehead-log','snakehead-review'],tip:'先核实有草、有鱼，再沿草边与缓流缝隙搜索；低温时降低追击预期。'},
  seabass:{aliases:['海鲈','花鲈'],activity:'twilight',style:'pelagic',evidence:'湛江冬季夜钓战报',sourceIds:['winter-seabass'],tip:'沿结构和流边搜索，低温适当慢收；天气分没有涵盖现场潮流。'},
  bass:{aliases:['加州鲈','黑鲈'],activity:'twilight',style:'cover',evidence:'威海投放水库作钓记录',sourceIds:['bass-log'],tip:'结构区与开阔水面轮换搜索，按水层调整软饵；投放密度需要现场核实。'}
 };
 const streamNames=new Set(['马口鱼','宽鳍鱲','长鳍鱲']);
 BiteModel.profiles=BiteModel.profiles.map(p=>{
  let rule=experience[p.id];
  if(streamNames.has(p.name))rule={aliases:p.name==='马口鱼'?['马口']:['溪哥'],activity:'daylight',style:'light',evidence:'七岔河马口作钓记录；宽鳍鱲、长鳍鱲沿用类群经验',sourceIds:['stream-log'],tip:'轻饵沿浅流与缓急交界搜索；起风、变天时先调整抛投与搜索节奏。'};
  if(['青梢红鲌','蒙古鲌','红鳍原鲌','鳡'].includes(p.name))rule={aliases:p.name==='青梢红鲌'?['青梢']:p.name==='红鳍原鲌'?['红尾']:[],activity:'twilight',style:'pelagic',evidence:'鲌类作钓经验类推，缺少本鱼种独立验证',sourceIds:['wujiang','shuhe'],tip:'先找饵鱼与水层，再变速搜索；同类鱼经验仅供参考。'};
  if(['斑鳜','长体鳜','大眼鳜'].includes(p.name))rule={activity:'lowlight',style:'bottom',evidence:'鳜类作钓经验类推，缺少本鱼种独立验证',sourceIds:['mandarin'],tip:'优先结构区与贴底搜索；钓层、流速需现场确认。'};
  if(['斑鳢','月鳢'].includes(p.name))rule={activity:'daylight',style:'cover',evidence:'鳢类作钓经验类推，缺少本鱼种独立验证',sourceIds:['snakehead-log'],tip:'先核实当地鱼种与藏身结构，再选择软饵或水面饵。'};
  return {...p,style:'general',aliases:[],sourceIds:[],tip:'先确认当地有该鱼种，按实际水层与标点调整拟饵。',evidence:'类群经验规则，尚无独立鱼种校准',...rule,domestic:domestic.has(p.name),origin:p.id==='bass'?'国内常见引入对象':domestic.has(p.name)?'国内路亚候选':'扩展鱼种',parameterSource:rule?'国内经验参考规则':'类群参考规则'};
 });
})();
