import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../../public/portal-preferences.js',import.meta.url),'utf8');
function boot({stored={},dark=false,blocked=false,path='/portal/tasks'}={}){
 const dataset={};
 vm.runInNewContext(script,{location:{pathname:path},document:{documentElement:{dataset}},localStorage:{getItem(key){if(blocked)throw Error('denied');return stored[key]??null}},matchMedia:()=>({matches:dark})});
 return dataset;
}
test('applies saved collapsed rail and dark mode before the shell mounts',()=>{
 assert.deepEqual(boot({stored:{'core.portal.theme':'dark','core.portal.sidebar.collapsed':'1','core.portal.density':'compact'}}),{portalThemePreference:'dark',portalTheme:'dark',density:'compact',portalSidebar:'collapsed'});
});
test('storage denial keeps usable system theme and comfortable defaults',()=>{
 assert.equal(boot({blocked:true,dark:true}).portalTheme,'dark');
 assert.equal(boot({blocked:true}).density,'comfortable');
});
test('an explicit light choice overrides a dark operating system',()=>{
 assert.equal(boot({dark:true,stored:{'core.portal.theme':'light'}}).portalTheme,'light');
});
test('invalid saved values are normalized, public pages are untouched',()=>{
 const result=boot({stored:{'core.portal.theme':'corrupt','core.portal.density':'bad','core.portal.sidebar.collapsed':'yes'}});
 assert.equal(result.portalThemePreference,'system');assert.equal(result.density,'comfortable');assert.equal(result.portalSidebar,'expanded');
 assert.deepEqual(boot({path:'/tr'}),{});
});
