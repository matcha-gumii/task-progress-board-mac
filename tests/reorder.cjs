const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../タスク管理ツール.html'), 'utf8');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
function extract(name) {
  const start = html.indexOf('      function ' + name + '(');
  const end = html.indexOf('\n      function ', start + 1);
  return html.slice(start, end);
}
const context = vm.createContext({});
vm.runInContext(`
const state = { projectTitle:'テスト', tasks: [
 {id:'a',createdOrder:1,subtasks:[{id:'s1',children:[{id:'g1',done:true},{id:'g2',done:false},{id:'g3',done:false}]},{id:'s2',children:[]},{id:'s3',children:[]}]},
 {id:'b',createdOrder:2,subtasks:[{id:'s4',children:[{id:'g4'}]}]},
 {id:'c',createdOrder:3,subtasks:[]}
]};
const ui = {sortBy:'createdOrder'};
${extract('reorderSiblings')}
${extract('isValidDateString')}
${extract('normalizeState')}
function info(kind,id,taskId='',subtaskId='') { return {kind,id,taskId,subtaskId}; }
`, context);
const run = source => vm.runInContext(source, context);
assert.equal(run("reorderSiblings(info('task','a'),info('task','c'),true)"), true);
assert.equal(run("state.tasks.map(t=>t.id).join()"), 'b,c,a');
assert.equal(run("state.tasks.map(t=>t.createdOrder).join()"), '1,2,3');
assert.equal(run("reorderSiblings(info('task','a'),info('task','b'),false)"), true);
assert.equal(run("state.tasks.map(t=>t.id).join()"), 'a,b,c');
assert.equal(run("reorderSiblings(info('subtask','s1','a'),info('subtask','s3','a'),true)"), true);
assert.equal(run("state.tasks[0].subtasks.map(t=>t.id).join()"), 's2,s3,s1');
assert.equal(run("reorderSiblings(info('grandchild','g3','a','s1'),info('grandchild','g1','a','s1'),false)"), true);
assert.equal(run("state.tasks[0].subtasks[2].children.map(t=>t.id).join()"), 'g3,g1,g2');
const snapshot = run('JSON.stringify(state)');
for (const expr of [
 "reorderSiblings(info('subtask','s1','a'),info('subtask','s4','b'),true)",
 "reorderSiblings(info('grandchild','g1','a','s1'),info('grandchild','g4','b','s4'),true)",
 "reorderSiblings(info('grandchild','g1','a','s1'),info('grandchild','g2','a','s2'),true)",
 "reorderSiblings(info('task','a'),info('subtask','s1'),true)",
 "reorderSiblings(info('task','missing'),info('task','b'),true)",
 "reorderSiblings(info('task','a'),info('task','a'),true)"
]) assert.equal(run(expr), false);
assert.equal(run('JSON.stringify(state)'), snapshot);
run("ui.sortBy='dueDate'");
assert.equal(run("reorderSiblings(info('task','a'),info('task','b'),true)"), false);
assert.equal(run('JSON.stringify(state)'), snapshot);
run('const restored = normalizeState(JSON.parse(JSON.stringify(state)))');
assert.equal(run('restored.tasks.map(t=>t.id).join()'), 'a,b,c');
assert.equal(run('restored.tasks[0].subtasks.map(t=>t.id).join()'), 's2,s3,s1');
assert.equal(run('restored.tasks[0].subtasks[2].children.map(t=>t.id).join()'), 'g3,g1,g2');
assert.equal(run('restored.tasks[0].subtasks[2].children[1].done'), true);
console.log('PASS: syntax, task moves both directions, child/grandchild ordering, parent boundaries, invalid drops, date-sort lock, JSON normalization and completion preservation.');
