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
