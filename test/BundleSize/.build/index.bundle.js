
!function(){const e=self.document;function n(e,n){e.appendChild(n)}function t(e,n){e.removeChild(n)}function r(e){return"function"==typeof e}function o(e){return"string"==typeof e}function i(){return e.createDocumentFragment()}const c={c:!0,h:!1,j:!1,n:!0},s={c:0,h:[],v:null};function f(e){setTimeout(e,0)}function l(e="",n){return{type:e,props:n,key:n.key||n["data-o"]||"t-kfgrz"}}const u=e=>e.children,a=e=>e instanceof HTMLElement||e instanceof SVGElement,d=e=>!(!e||!e._n&&!e.props),h=e=>{var n;return e?e._n||(null===(n=e._r)||void 0===n?void 0:n._n):null},p=e=>!!e||0===e,y=(e,n)=>e&&n&&(e===n||e.key===n.key&&e.type===n.type);function v(e){return d(e)&&(e=e.type),e===u}function _(t,f){if(!c.j||a(t)||o(t)||"number"==typeof t||void 0===t)return t;let A;const L=null==f?void 0:f.props;var N,b;if(f&&(N=f,b=t,["_h","_i","_n","_p","_r"].forEach((e=>{void 0!==N[e]&&(b[e]=N[e])})),t._i&&(t._i._v=t)),Array.isArray(t)){return _({type:u,props:{children:t},key:""})}const{type:T,props:C={},svg:M}=t,j=C.children,x=v(T);if(r(T)&&!x){let e=t;{t._h=t._h||[],s.h=t._h,s.c=0,s.v=t;const e=T(C);if(!d(e))return delete t._n,e;e.key=t.key,A=_(e,t._r),t._r=e}t._p={...t},C.ref&&(r(C.ref)?C.ref(e):void 0!==C.ref.current&&(C.ref.current=e))}else{if(!x){a(T)&&(A=T);const n=h(f);if(!A&&n&&y(f,t)&&(A=n),!A){if(!o(T))return;-1!==T.indexOf("<")?(E.innerHTML=T,A=E.firstElementChild.cloneNode(!0),E.innerHTML=""):A=T?e.createElement(T):e.createTextNode(C.text)}!function(e,n={},t={}){if(e instanceof Text)e.textContent=n.text;else if(a(e)){const o={};for(let r in t){let i=t[r];i!==n[r]?/^on[A-Z]/.test(r)?e.removeEventListener(r.substr(2).toLowerCase(),i):e.removeAttribute(r):o[r]=!0}for(let t in n){if(o[t])continue;let i=n[t];if(!/^className|children|key$/.test(t)){if("style"===t)i=k(i);else{if("html"===t){e.innerHTML=i;continue}if("dangerouslySetInnerHTML"===t){e.innerHTML=i.__html;continue}if("ref"===t&&i){r(i)?i(e):void 0!==i.current&&(i.current=e);continue}}!1!==i&&void 0!==i&&(/^on[A-Z]/.test(t)?e.addEventListener(t.substr(2).toLowerCase(),i):null!==i&&(i=i.toString(),e.setAttribute(t,i)))}}}}(A,C,L)}x&&(A=i()),t.props.children=function(e,t,r=[],o){const i=new Map,s=o||[];for(const e of s)null!=e&&e.key&&i.set(e.key,e);const f=m(r).map(((r,o)=>{let c,s=r;if(p(r)&&(d(r)||(r=l("",{text:r})),e.svg&&(r.svg=!0),r.props.key||(r.key=e.key+(v(e)?"":o)),r.props["data-o"]=null,c=i.get(r.key),y(r,c)||(c=void 0),s=_(r,c),h(r)&&d(c)&&i.delete(c.key)),p(s)){const e=t.childNodes[o];return e!==s&&(o?function(e,n,t){e.insertBefore(n,t)}(t,s,e):n(t,s)),r}}));if(c.h)for(const[e,n]of i)g(n);return f}(t,A,j,null==L?void 0:L.children)}return t._n=(null==f?void 0:f._n)||A,t._n}function m(e){const n=[];return e.forEach((e=>{Array.isArray(e)?n.push(...m(e)):n.push(e)})),n}const k=e=>o(e)?e:e&&"object"==typeof e?Object.keys(e).reduce(((n,t)=>`${n+=t.split(/(?=[A-Z])/).join("-").toLowerCase()}:${e[t]};`),""):"",E=e.createElement("div");function g(e){if(d(e)){c.h&&e._h&&(e._h.forEach((e=>{3===e.length&&r(e[2])&&e[2]()})),e._h=[]);const n=h(e);(e._r||e).props.children.forEach((e=>{d(e)&&r(e.type)&&g(e)})),null!=n&&n.parentNode&&t(n.parentNode,n),delete e._n}}function A(e){if(Array.isArray(e))return e;if(!e)return[];let n=[e];return 11===e.nodeType&&(n=Array.from(e.children)),n}function L(e){const t=A(e),r=i();return t.forEach((t=>{n(r,t),t.dataset.o||(t.dataset.o=e.key||"t-kfgrz")})),r}c.h=!0;const N=function(e,n,...t){(n=n||{}).class?n.className=n.class:n.className&&(n.class=n.className),n.children=t||[];const r=l(e,n);return"svg"===e&&(r.svg=!0),c.j=!0,r};!function(e,r,o=!0){const i=function(e){if(a(e))return L(e);if(!c.j)return e;let n=e;if(d(e)&&(n=L(_(e)),c.h)){const t=[...n.childNodes];f((()=>{var n;const r=null===(n=t[0])||void 0===n?void 0:n.parentElement;r&&new MutationObserver(((n,r)=>{n.forEach((n=>{n.removedNodes.forEach((n=>{t.includes(n)&&(r.disconnect(),g(e))}))}))})).observe(r,{childList:!0})}))}return n}(e);o&&function(e,n){A(e).forEach((e=>{let r;var o;r=d(e)?e.key:null===(o=e.dataset)||void 0===o?void 0:o.o,r&&Array.from(n.children).forEach((e=>{e.dataset.o===r&&t(n,e)}))}))}(i,r),n(r,i)}(N((()=>{const[e,n]=(e=>{s.h[s.c]||(s.h[s.c]=[e,((e,n,t)=>r=>{e[n][0]=r,t&&f((()=>{t._h=e,t._p&&(t._p._h=e),_(t,t._p)}))})(s.h,s.c,s.v)]);const n=s.h[s.c];return s.c++,n})(1);return N("div",{onClick:()=>n(e+1)},e)}),null),e.body)}();
