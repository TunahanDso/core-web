import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
const css=postcss.parse(fs.readFileSync(new URL('../../app/portal-design.css',import.meta.url),'utf8'));
function palette(theme){const values={};for(const rule of css.nodes){if(rule.type!=='rule')continue;if(rule.selector===':root'||(theme!=='light'&&rule.selector==='html:is([data-portal-theme="dark"],[data-portal-theme="aurora"])')||(theme==='aurora'&&rule.selector==='html[data-portal-theme="aurora"]')){for(const d of rule.nodes)if(d.type==='decl')values[d.prop]=d.value;}}return values;}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const theme of ['light','dark','aurora'])test(`${theme}: normal text and status pairs meet 4.5:1 contrast`,()=>{
 const p=palette(theme);
 for(const fg of ['--core-text','--core-text-secondary','--core-text-muted','--core-accent'])for(const bg of ['--core-surface-base','--core-surface-subtle','--core-surface-hover','--core-surface-selected'])assert.ok(ratio(p[fg],p[bg])>=4.5,`${theme} ${fg} on ${bg}: ${ratio(p[fg],p[bg]).toFixed(2)}`);
 for(const state of ['success','danger','warning'])assert.ok(ratio(p['--core-'+state],p['--core-status-'+state+'-bg'])>=4.5,`${theme} ${state}`);
 assert.ok(ratio(p['--core-on-accent'],p['--core-accent-fill'])>=4.5,`${theme} accent button`);
});
test('Aurora decorative gradient endpoints preserve readable text',()=>{
 for(const surface of ['#26213f','#192638','#211939','#11182d'])assert.ok(ratio('#bfc4e5',surface)>=4.5);
 for(const fill of ['#c4a7ff','#91edff'])assert.ok(ratio('#141a31',fill)>=4.5);
});
