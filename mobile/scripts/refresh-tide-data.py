"""Download original annual HKO station predictions; never synthesize missing data."""
import argparse,concurrent.futures,datetime,json,pathlib,time,urllib.request
parser=argparse.ArgumentParser();parser.add_argument('--years',nargs='+',type=int,default=[datetime.datetime.now().year]);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]/'data'/'tides';root.mkdir(parents=True,exist_ok=True)
jobs=[(s,y,k) for s in ['TBT','QUB','SPW','TMW','TPK','WAG'] for y in args.years for k in ['HHOT','HLT']]
def get(job):
 s,y,k=job;url=f'https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType={k}&station={s}&year={y}&rformat=csv';error=''
 for attempt in range(2):
  try:
   text=urllib.request.urlopen(url,timeout=18).read().decode('utf-8-sig')
   if not text.startswith(('MM,DD,','Month,Date,')) or len(text.splitlines())<300:raise ValueError('not an annual station CSV')
   path=f'{s}-{y}-{k}.csv';(root/path).write_text(text,encoding='utf8');return {'station':s,'year':y,'kind':k,'file':path,'source':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  except Exception as e:error=str(e)
 return {'station':s,'year':y,'kind':k,'error':error}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(get,jobs))
manifest={'provider':'香港天文台 / HKO','datum':'香港海图基准面 CD（低于香港主水平基准0.146米）','timezone':'Asia/Hong_Kong','kind':'astronomical_prediction','terms':'https://data.gov.hk/sc/terms-and-conditions','entries':[x for x in results if 'file' in x],'unavailable':[x for x in results if 'error' in x]}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'downloaded':len(manifest['entries']),'unavailable':manifest['unavailable']},ensure_ascii=False))
