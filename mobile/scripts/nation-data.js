/* Geocoding is a place index, not a boundary or fish-distribution database. */
(function(root){
 const provinces='北京|天津|河北|山西|内蒙古|辽宁|吉林|黑龙江|上海|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|重庆|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|香港|澳门|台湾'.split('|');
 const countries=['CN','HK','MO','TW'];
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 const province=s=>String(s||'').replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g,'');
 function url(q,country='CN'){const u=new URL('https://geocoding-api.open-meteo.com/v1/search');u.search=new URLSearchParams({name:q.trim(),count:'100',language:'zh',countryCode:country});return u.href;}
 function normalize(responses,filter=''){const result=[];for(const raw of responses)for(const r of raw.results||[]){const p={name:String(r.name||''),lat:r.latitude,lng:r.longitude,admin:String(r.admin1||r.country||''),district:String(r.admin2||''),country:r.country_code,population:r.population||0};if(!p.name||!valid(p)||!countries.includes(p.country))continue;if(filter&&!province(p.admin).includes(province(filter))&&!province(p.name).includes(province(filter)))continue;if(!result.some(x=>Math.abs(x.lat-p.lat)<.0001&&Math.abs(x.lng-p.lng)<.0001))result.push(p);}return result.sort((a,b)=>b.population-a.population);}
 const api={provinces,countries,valid,province,url,normalize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChinaPlaces=api;
})(globalThis);
