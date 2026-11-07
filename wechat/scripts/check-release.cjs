const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),project=JSON.parse(fs.readFileSync(path.join(root,'project.config.json'))),config=require('../miniprogram/config');
const missing=[];
if(!/^wx[0-9a-f]{16}$/.test(project.appid))missing.push('真实小程序AppID（当前是无账号开发占位值）');
if(!config.cloudEnv||/your|placeholder|填写/i.test(config.cloudEnv))missing.push('与AppID关联的微信云开发环境ID');
if(missing.length){console.error('发布检查未通过：\n- '+missing.join('\n- ')+'\n代码工程不等于已上传、提审或正式发布。');process.exitCode=1;}
else console.log('本地配置字段检查通过；仍须在微信后台核实主体、备案、类目、隐私、接口权限及云函数实际部署，完成真机测试后才可提审。');
