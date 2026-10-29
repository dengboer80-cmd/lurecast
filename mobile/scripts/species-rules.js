/* Experimental family defaults: product parameters awaiting field calibration.
   Includes occasional lure catches and overseas managed-fishery species.
   This catalogue does not assert local presence, taxonomy uniqueness or completeness. */
(function(){
 const old=new Map(BiteModel.profiles.map(p=>[p.name,p]));
 const groups=[
  [0,5,18,28,6,34,true,'鲌类'],[6,9,18,28,5,34,true,'鳜类'],[10,12,22,30,10,36,true,'鳢类'],
  [13,15,18,27,5,34,true,'黑鲈类'],[16,20,15,25,5,32,true,'溪流及鲤科鱼'],[21,23,20,28,7,34,true,'鲶类'],
  [24,26,18,28,5,34,false,'杂食鲤科鱼（偶然路亚对象）'],[27,28,24,31,15,36,false,'罗非鱼'],[29,30,18,26,6,32,true,'太阳鱼科'],
  [31,34,10,18,1,24,true,'冷水鲑鳟'],[35,36,10,20,1,28,true,'狗鱼'],[37,39,12,22,2,30,true,'鲈形冷温水鱼'],[40,40,8,16,1,22,true,'哲罗鲑'],
  [41,44,25,31,18,35,true,'热带淡水掠食鱼'],[45,46,15,25,5,32,true,'海鲈'],[47,47,24,30,15,35,true,'尖吻鲈'],
  [48,49,22,29,14,34,true,'笛鲷'],[50,53,22,28,12,33,true,'石斑鱼'],[54,57,16,26,8,32,false,'鲷类'],
  [58,61,10,20,2,27,true,'冷温水礁栖鱼'],[62,64,15,24,5,30,true,'底栖掠食鱼'],[65,65,18,28,8,33,false,'鲻鱼（偶然路亚对象）'],
  [66,68,18,26,10,32,true,'小型鲹类'],[69,72,23,29,15,34,true,'大型鲹及军曹鱼'],[73,74,24,30,15,35,true,'海鲢'],
  [75,75,18,26,8,32,true,'海鳗'],[76,76,15,24,5,30,true,'鲆类'],[77,78,18,27,10,32,true,'马鲛'],
  [79,79,17,26,8,32,true,'石首鱼'],[80,80,18,26,10,31,true,'带鱼'],[81,82,14,22,6,28,true,'温水游泳鱼'],
  [83,88,10,17,1,23,true,'洄游鲑鱼（水域需手选）'],[89,91,20,28,12,33,true,'金枪鱼类'],[92,92,24,29,18,34,false,'鬼头刀'],
  [93,95,22,28,15,33,false,'旗鱼类'],[96,96,22,29,14,34,true,'梭鱼']
 ];
 BiteModel.profiles=fishCatalogue.map((f,i)=>{const g=groups.find(g=>i>=g[0]&&i<=g[1]);const base=old.get(f.name);return {...(base||{id:'fish-'+String(i).padStart(3,'0'),name:f.name,habitat:f.habitat==='淡水'?'fresh':'sea',ideal:[g[2],g[3]],tolerance:[g[4],g[5]],dawn:g[6],bait:f.bait}),artIndex:i,group:g[7],parameterSource:base?'鱼种实验参数':'类群实验参数'};});
})();
