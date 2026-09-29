import { useSyncExternalStore, type AnchorHTMLAttributes } from 'react';
function subscribe(listener:()=>void){window.addEventListener('popstate',listener);return()=>window.removeEventListener('popstate',listener)}
function push(href:string){history.pushState({},'',href);window.dispatchEvent(new PopStateEvent('popstate'))}
export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname,()=>'/portal')}
export function useRouter(){return {push,refresh(){}}}
export default function Link({prefetch,href='',...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{prefetch?:boolean}){
 return <a {...props} href={href} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&e.button===0){e.preventDefault();push(href)}}}/>;
}
