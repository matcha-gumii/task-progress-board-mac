const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../タスク管理ツール.html'),'utf8');
function extract(name){const a=html.indexOf('      function '+name+'('),b=html.indexOf('\n      function ',a+1);return html.slice(a,b);}
const ctx=vm.createContext({});
vm.runInContext(`
let state={projectTitle:'Test',tasks:[{id:'t_001',title:'親',note:'parent',assignee:'佐藤',status:'completed',createdOrder:1,subtasks:[{id:'s1',title:'子',note:'child',done:true,children:[{id:'g1',title:'孫',note:'参考 https://example.com',dueDate:'2000-01-01',done:true}]}]}]};
const ui={editing:null},undoHistory=[],redoHistory=[];let lastSnapshot=null;let currentLanguage='ja';
const document={getElementById:()=>({disabled:false})};
${['clone','isValidDateString','normalizeState','todayString','isOverdue','subtaskProgress','nextTaskId','nextCreatedOrder','recordHistory','restoreHistory','taskMatches','duplicateTask'].map(extract).join('\n')}
function render(){recordHistory();}
`,ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run("taskMatches(state.tasks[0],'参考','all')"),true);
assert.equal(run("taskMatches(state.tasks[0],'佐藤','all')"),true);
assert.equal(run("taskMatches(state.tasks[0],'存在しない','all')"),false);
assert.equal(run("taskMatches(state.tasks[0],'','unfinished')"),false);
assert.equal(run("taskMatches(state.tasks[0],'','overdue')"),false);
run('recordHistory();duplicateTask(state.tasks[0]);recordHistory();');
assert.equal(run('state.tasks.length'),2);
assert.equal(run('state.tasks[1].subtasks[0].children[0].done'),false);
assert.notEqual(run('state.tasks[0].id'),run('state.tasks[1].id'));
assert.equal(run("taskMatches(state.tasks[1],'','overdue')"),true);
run('restoreHistory(true)');assert.equal(run('state.tasks.length'),1);
run('restoreHistory(false)');assert.equal(run('state.tasks.length'),2);
assert.equal(run('state.tasks[1].subtasks[0].children[0].note'),'参考 https://example.com');
run("restoreHistory(true);state.projectTitle='新しい操作';recordHistory();");assert.equal(run('redoHistory.length'),0);
run('for(let i=0;i<70;i++){state.projectTitle=String(i);recordHistory();}');assert.equal(run('undoHistory.length'),50);
assert.equal(run("normalizeState({tasks:[{subtasks:[{children:[{}]}]}]}).tasks[0].subtasks[0].children[0].note"),'');
console.log('PASS: recursive search, assignee/status/overdue filters, deep duplicate with reset, undo/redo and branching, 50-step limit, notes roundtrip and old-data compatibility.');
