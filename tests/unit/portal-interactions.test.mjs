import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React,{act} from 'react';
import {pathToFileURL} from 'node:url';
const repo=process.cwd(),out=path.join(repo,'node_modules/.cache/portal-interactions.mjs');
await build({stdin:{contents:`export {default as Nav} from './components/portal/PortalNav';export {default as Sidebar} from './components/portal/PortalSidebarToggle';export {default as Theme} from './components/portal/PortalThemeControl';export {default as Command} from './components/portal/PortalCommandCenter';export {default as Media} from './components/portal/MeetingTransportPanel';`,resolveDir:repo,loader:'tsx'},outfile:out,bundle:true,platform:'node',format:'esm',jsx:'automatic',external:['react','react-dom','react/jsx-runtime'],alias:{'@':repo,'next/link':path.join(repo,'tests/ui/navigation.tsx'),'next/navigation':path.join(repo,'tests/ui/navigation.tsx')}});
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/portal/mail'});
for(const key of ['window','document','HTMLElement','HTMLDialogElement','Event','KeyboardEvent','MouseEvent','PopStateEvent','localStorage'])globalThis[key]=key==='window'?dom.window:dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.location=dom.window.location;globalThis.history=dom.window.history;
let dark=false;const mediaListeners=new Set();
globalThis.matchMedia=dom.window.matchMedia=()=>({get matches(){return dark},addEventListener(_,fn){mediaListeners.add(fn)},removeEventListener(_,fn){mediaListeners.delete(fn)}});
const {createRoot}=await import('react-dom/client');
const {Nav,Sidebar,Theme,Command,Media}=await import(pathToFileURL(out));
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
function click(el){assert.ok(el);el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}))}
async function mount(element){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(()=>root.render(element));return{host,root,async close(){await act(()=>root.unmount());host.remove()}}}
after(async()=>{dom.window.close();await fs.rm(out,{force:true})});
test('selected navigation group does not snap back to the current route group',async()=>{
 const ui=await mount(React.createElement(Nav,{canControl:true}));
 const ops=[...ui.host.querySelectorAll('button')].find(b=>b.title==='OPERASYON');
 await act(()=>click(ops));
 assert.equal(ops.getAttribute('aria-pressed'),'true');assert.ok(ui.host.querySelector('a[href="/portal/inventory"]'));
 await act(()=>{history.pushState({},'','/portal/documents');window.dispatchEvent(new PopStateEvent('popstate'))});
 assert.equal([...ui.host.querySelectorAll('button')].find(b=>b.title==='BİLGİ & ARŞİV').getAttribute('aria-pressed'),'true');
 await ui.close();
});
test('collapsed rail survives component replacement and denied storage',async()=>{
 document.documentElement.dataset.portalSidebar='expanded';
 let ui=await mount(React.createElement(Sidebar));
 await act(()=>click(ui.host.querySelector('button')));
 assert.equal(document.documentElement.dataset.portalSidebar,'collapsed');
 await ui.close();ui=await mount(React.createElement(Sidebar));
 assert.equal(ui.host.querySelector('button').getAttribute('aria-expanded'),'false');
 const proto=Object.getPrototypeOf(localStorage),old=proto.setItem;proto.setItem=()=>{throw Error('denied')};
 try{await act(()=>click(ui.host.querySelector('button')));assert.equal(document.documentElement.dataset.portalSidebar,'expanded')}finally{proto.setItem=old;await ui.close()}
});
test('theme controls synchronize and only system mode follows OS changes',async()=>{
 document.documentElement.dataset.portalThemePreference='system';
 const ui=await mount(React.createElement(React.Fragment,null,React.createElement(Theme),React.createElement(Theme)));
 const selects=ui.host.querySelectorAll('select');
 await act(()=>{selects[0].value='dark';selects[0].dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(selects[1].value,'dark');assert.equal(document.documentElement.dataset.portalTheme,'dark');
 await act(()=>{dark=false;for(const fn of mediaListeners)fn()});assert.equal(document.documentElement.dataset.portalTheme,'dark');
 await act(()=>{selects[0].value='system';selects[0].dispatchEvent(new Event('change',{bubbles:true}));dark=true;for(const fn of mediaListeners)fn()});
 assert.equal(document.documentElement.dataset.portalTheme,'dark');
 await ui.close();assert.equal(mediaListeners.size,0);
});
test('command search opens with one shortcut, closes with Escape and restores focus',async()=>{
 const ui=await mount(React.createElement(Command,{canControl:false}));
 const trigger=ui.host.querySelector('button');trigger.focus();
 await act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})));
 assert.ok(ui.host.querySelector('dialog[open]'));assert.equal(document.activeElement.tagName,'INPUT');assert.equal(document.body.style.overflow,'hidden');
 await act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 assert.equal(ui.host.querySelector('dialog'),null);assert.equal(document.activeElement,trigger);assert.equal(document.body.style.overflow,'');
 await ui.close();
});

test('Aurora selection synchronizes across controls without following OS theme',async()=>{
 const ui=await mount(React.createElement(React.Fragment,null,React.createElement(Theme),React.createElement(Theme)));
 const controls=ui.host.querySelectorAll('select');
 await act(()=>{controls[0].value='aurora';controls[0].dispatchEvent(new Event('change',{bubbles:true}));for(const fn of mediaListeners)fn()});
 assert.equal(controls[1].value,'aurora');assert.equal(document.documentElement.dataset.portalTheme,'aurora');await ui.close();
});
test('meeting provider iframe only loads after joining and unloads on leaving',async()=>{
 const ui=await mount(React.createElement(Media,{configured:true,joinUrl:'https://meet.example.test/room',provider:'Test',room:'test',mode:'audio_video'}));
 assert.equal(ui.host.querySelector('iframe'),null);
 await act(()=>click([...ui.host.querySelectorAll('button')].find(b=>b.textContent==='Toplantıya katıl')));
 assert.ok(ui.host.querySelector('iframe'));
 await act(()=>click([...ui.host.querySelectorAll('button')].find(b=>b.textContent==='Odadan ayrıl')));
 assert.equal(ui.host.querySelector('iframe'),null);await ui.close();
});
test('media granted after unmount immediately stops every track',async()=>{
 let resolve;let stopped=0;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(r=>{resolve=r})}});
 const ui=await mount(React.createElement(Media,{configured:false,joinUrl:null,provider:'',room:'test',mode:'audio'}));
 await act(()=>click([...ui.host.querySelectorAll('button')].find(b=>b.textContent==='Mikrofonu test et')));
 await ui.close();
 await act(async()=>resolve({getTracks:()=>[{stop(){stopped++}},{stop(){stopped++}}]}));
 assert.equal(stopped,2);
});
test('stopping a pending media request releases a later grant',async()=>{
 let resolve;let stopped=0;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(r=>{resolve=r})}});
 const ui=await mount(React.createElement(Media,{configured:false,joinUrl:null,provider:'',room:'test',mode:'audio'}));
 await act(()=>click([...ui.host.querySelectorAll('button')].find(b=>b.textContent==='Mikrofonu test et')));
 await act(()=>click([...ui.host.querySelectorAll('button')].find(b=>b.textContent==='Testi durdur')));
 await act(async()=>resolve({getTracks:()=>[{stop(){stopped++}}]}));assert.equal(stopped,1);await ui.close();
});
