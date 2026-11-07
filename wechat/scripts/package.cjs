const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const script=String.raw`import pathlib,zipfile
root=pathlib.Path.cwd()
out=root/'wechat-output';out.mkdir(exist_ok=True)
files=[]
for p in (root/'wechat').rglob('*'):
 if p.is_file() and not any(x in {'node_modules','.git','output'} or x.startswith('.env') for x in p.relative_to(root).parts):files.append(p)
for pattern in ['mobile/scripts/bite-model.js','mobile/scripts/fish-data.js','mobile/scripts/species-rules.js','mobile/scripts/free-data.js','mobile/scripts/nation-data.js','mobile/scripts/tide-data.js','mobile/data/tides/*.csv']:
 files.extend(root.glob(pattern))
with zipfile.ZipFile(out/'LureCast-WeChat-0.1.0.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(set(files)):z.write(p,pathlib.Path('LureCast-WeChat')/p.relative_to(root))
print(str(out/'LureCast-WeChat-0.1.0.zip'))
`;
process.stdout.write(execFileSync('python3',['-c',script],{cwd:root}));
