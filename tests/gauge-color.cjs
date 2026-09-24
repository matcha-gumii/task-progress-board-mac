const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../タスク管理ツール.html'),'utf8');
const code=html.slice(html.indexOf("      const GAUGE_KEY ="),html.indexOf("      const THEME_KEY ="));
function load(saved,fail=false){
 const data=new Map(saved?[['progress_board_gauge_v1',saved]]:[]);
 const select={value:'',addEventListener(_,fn){this.change=fn;}},notice={textContent:'',dataset:{}};
 const document={body:{dataset:{}},getElementById(id){return id==='gaugeColorSelect'?select:notice;}};
 const localStorage={getItem:k=>data.get(k),setItem(k,v){if(fail)throw Error('blocked');data.set(k,v);}};
 vm.runInNewContext(code,{document,localStorage,translateString:value=>value});return {data,select,notice,document};
}
assert.equal(load().select.value,'theme');assert.equal(load('invalid').select.value,'theme');
for(const color of ['theme','blue','green','gold']){
 const app=load();app.select.change({target:{value:color}});
 assert.equal(app.document.body.dataset.gauge,color);
 assert.equal(load(app.data.get('progress_board_gauge_v1')).select.value,color);
}
const app=load('theme',true);app.select.change({target:{value:'green'}});
assert.equal(app.document.body.dataset.gauge,'green');assert.match(app.notice.textContent,/保存できません/);
console.log('PASS: default, all selections, persistence/reload, invalid preference fallback, storage failure.');
