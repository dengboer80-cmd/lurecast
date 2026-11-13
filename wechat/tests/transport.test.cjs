const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{EventEmitter}=require('node:events');
function transport(){
 let deadline,options,request;const box={module:{exports:{}},URL,Buffer,console,setTimeout(fn,ms){deadline={fn,ms};return 1;},clearTimeout(){},require(name){if(name==='node:https')return {get(url,opts){options=opts;request=new EventEmitter();request.destroy=e=>request.emit('error',e);return request;}};return {};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../cloudfunctions/lurecastData/core'),'utf8'),box);
 return {getJSON:box.module.exports.getJSON,deadline:()=>deadline,options:()=>options,request:()=>request};
}
test('weather transport uses IPv4 and a bounded ten-second deadline with request-stage diagnostics',async()=>{
 const t=transport(),promise=t.getJSON('https://api.open-meteo.com/v1/forecast');
 assert.equal(t.options().family,4);assert.equal(t.deadline().ms,10000);
 const socket=new EventEmitter();t.request().emit('socket',socket);socket.emit('lookup',null);socket.emit('connect');socket.emit('secureConnect');
 t.deadline().fn();await assert.rejects(promise,e=>e.code==='SOURCE_TIMEOUT'&&e.phase==='RESPONSE');
 const dns=transport(),pending=dns.getJSON('https://api.open-meteo.com/v1/forecast');dns.deadline().fn();await assert.rejects(pending,e=>e.code==='SOURCE_TIMEOUT'&&e.phase==='DNS');
});
