import { useSyncExternalStore, type AnchorHTMLAttributes } from 'react';
function subscribe(listener:()=>void){window.addEventListener('popstate',listener);return()=>window.removeEventListener('popstate',listener)}
function push(href:string){history.pushState({},'',href);window.dispatchEvent(new PopStateEvent('popstate'))}
export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname,()=>'/portal')}
export function useFixtureLocation(){return useSyncExternalStore(subscribe,()=>location.pathname+location.search,()=>'/portal')}
const router={push,refresh(){},back(){history.back()}};
export function useRouter(){return router}
export default function Link({prefetch,href='',...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{prefetch?:boolean}){
 return <a {...props} href={href} onClick={e=>{props.onClick?.(e);if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&e.button===0){e.preventDefault();push(href)}}}/>;
}
