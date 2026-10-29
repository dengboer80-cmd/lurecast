/* HKO annual CSV parser. Original 01..24 hours are HKT, never 00..23. */
(function(root){
 const stations=[
  {id:'TBT',name:'尖鼻咀',lat:22+29/60+14/3600,lng:114+51/3600},
  {id:'QUB',name:'鲗鱼涌',lat:22+17/60+28/3600,lng:114+12/60+48/3600},
  {id:'SPW',name:'石壁',lat:22+13/60+13/3600,lng:113+53/60+40/3600},
  {id:'TMW',name:'大庙湾',lat:22+16/60+11/3600,lng:114+17/60+19/3600},
  {id:'TPK',name:'大埔滘',lat:22+26/60+33/3600,lng:114+11/60+2/3600},
  {id:'WAG',name:'横澜岛',lat:22+10/60+59/3600,lng:114+18/60+10/3600}
 ].map(s=>({...s,region:'香港',provider:'香港天文台',datum:'香港海图基准面 CD',timezone:'Asia/Hong_Kong'}));
 const pad=v=>String(v).padStart(2,'0');
 function localTime(year,month,day,hour,minute=0){const d=new Date(Date.UTC(year,month-1,day,hour,minute));return d.toISOString().slice(0,16);}
 function rows(csv){const lines=String(csv).replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(!/^(MM,DD|Month,Date),/.test(lines[0]))throw Error('站点服务未返回官方CSV');return lines.slice(1).map(l=>l.split(',').map(v=>v.replace(/^"|"$/g,'').trim()));}
 function numeric(v){return v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;}
 function hourly(csv,year){let out=[];for(const r of rows(csv)){const m=Number(r[0]),d=Number(r[1]);if(!(m>=1&&m<=12&&d>=1&&d<=31))continue;for(let h=1;h<=24;h++)out.push({time:localTime(year,m,d,h),value:numeric(r[h+1])});}return out.sort((a,b)=>a.time.localeCompare(b.time));}
 function extremes(csv,year){let out=[];for(const r of rows(csv)){for(let i=2;i<r.length;i+=2){const t=r[i]?.replace(':',''),v=numeric(r[i+1]);if(!/^\d{4}$/.test(t)||v===null)continue;const h=Number(t.slice(0,2)),min=Number(t.slice(2));if(h>24||min>59||(h===24&&min!==0))continue;out.push({time:localTime(year,+r[0],+r[1],h,min),value:v,type:null});}}out.sort((a,b)=>a.time.localeCompare(b.time));return out.map((v,i)=>{const neighbors=[out[i-1],out[i+1]].filter(Boolean);return {...v,type:neighbors.length&&neighbors.every(n=>v.value>n.value)?'H':neighbors.length&&neighbors.every(n=>v.value<n.value)?'L':null};});}
 function distance(p,q){const r=Math.PI/180,a=(q.lat-p.lat)*r,b=(q.lng-p.lng)*r,v=Math.sin(a/2)**2+Math.cos(p.lat*r)*Math.cos(q.lat*r)*Math.sin(b/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,v)));}
 function nearest(p){if(!Number.isFinite(p?.lat)||!Number.isFinite(p?.lng))return [];return stations.map(s=>({...s,distance:distance(p,s)})).sort((a,b)=>a.distance-b.distance);}
 function sourceURL(station,year,kind){if(!stations.some(s=>s.id===station)||!['HHOT','HLT'].includes(kind)||!Number.isInteger(year))throw Error('无效站点');return 'https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?'+new URLSearchParams({dataType:kind,station,year,rformat:'csv'});}
 const api={stations,hourly,extremes,nearest,distance,sourceURL};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TideStations=api;
})(globalThis);
