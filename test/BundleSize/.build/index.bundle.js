!function(){const e=self,n=e.document;function t(e,n){e.appendChild(n)}function r(e,n){e.removeChild(n)}function o(e){return"function"==typeof e}function i(e){return"string"==typeof e}function s(){return n.createDocumentFragment()}const c={jsx:!1},l={c:0,h:[],v:null};function u(e){setTimeout(e,0)}function f(e="",n){return{type:e,props:n,key:n.key||n["data-o"]||"tryk3l"}}const a=e=>e.children,d=e=>e instanceof HTMLElement||e instanceof SVGElement,p=e=>!(!e||!e._n&&!e.props),_=e=>{var n;return e?e._n||(null===(n=e._r)||void 0===n?void 0:n._n):null},h=e=>!!e||0===e,v=(e,n)=>e&&n&&(e===n||e.key===n.key&&e.type===n.type);function y(e){return p(e)&&(e=e.type),e===a}let m;function k(e){if(!c.jsx)return null;const n=m[e];return n?0!==n.indexOf("http")?`http://www.w3.org/${n}`:n:null}function g(N,b){if(!c.jsx||d(N)||i(N)||"number"==typeof N||void 0===N)return N;let A;m||(m=e.__namespaces||{svg:"2000/svg",space:"XML/1998/namespace",xlink:"1999/xlink",xmlns:"2000/xmlns/"},e.__namespaces=m);const w=null==b?void 0:b.props;var M,T;if(b&&(M=b,T=N,["_h","_i","_n","_r"].forEach((e=>{void 0!==M[e]&&(T[e]=M[e])})),N._i&&(N._i._v=N,N._i._r=b)),Array.isArray(N)){return g({type:a,props:{children:N},key:""})}const{type:j,props:C={},svg:H}=N,D=C.children,O=y(j);if(o(j)&&!O){var S;functionType=j;let e=N;const n=N._r;if(null!==(S=j.prototype)&&void 0!==S&&S.render){let e=N._i;const t=[];if(e){const n=Object.assign({},e.state);N._i.props=C,e.componentDidUpdate&&t.push((()=>e.componentDidUpdate(w,n)))}else N._i=e=new j(C),e._v=N,e.componentDidMount&&t.push((()=>e.componentDidMount()));const r=e.render();if(!p(r))return delete N._n,delete N._r,r;r.key=N.key,e._r=N._r=r,A=g(r,n),t.forEach((e=>u(e())))}else{N._h=N._h||[],l.h=N._h,l.c=0,l.v=N;const e=j(C);if(!p(e))return delete N._n,e;e.key=N.key,A=g(e,N._r),N._r=e}C.ref&&(o(C.ref)?C.ref(e):void 0!==C.ref.current&&(C.ref.current=e))}else{if(!O){d(N)&&(A=j);const e=_(b);if(!A&&e&&v(b,N)&&(A=e),!A){if(!i(j))return;-1!==j.indexOf("<")?(x.innerHTML=j,A=x.firstElementChild.cloneNode(!0),x.innerHTML=""):A=j?H?n.createElementNS(k("svg"),j):n.createElement(j):n.createTextNode(C.text)}!function(e,n={},t={}){if(e instanceof Text)e.textContent=n.text;else if(d(e)){const r={};for(let o in t){let i=t[o];i!==n[o]?/^on[A-Z]/.test(o)?e.removeEventListener(o.substr(2).toLowerCase(),i):e.removeAttribute(o):r[o]=!0}for(let t in n){if(r[t])continue;let i=n[t];if("className"!==t&&"children"!==t&&"key"!==t){if("style"===t)i=E(i);else{if("html"===t){e.innerHTML=i;continue}if("dangerouslySetInnerHTML"===t){e.innerHTML=i.__html;continue}if("ref"===t&&i){o(i)?i(e):void 0!==i.current&&(i.current=e);continue}}if(!1!==i&&void 0!==i)if(/^on[A-Z]/.test(t))e.addEventListener(t.substr(2).toLowerCase(),i);else if(null!==i)if(i=i.toString(),t.includes(":")&&"svg"!=e.tagName.toLowerCase()){const[n,r]=t.split(":");e.setAttributeNS(k(r)||k(n),t,i)}else e.setAttribute(t,i)}}}}(A,C,w)}O&&(A=s()),N.props.children=function(e,n,o=[],i){const s=new Map,c=i||[];for(const e of c)null!=e&&e.key&&s.set(e.key,e);const l=o.reduce(((e,n)=>e.concat(n)),[]).map(((r,o)=>{let i,c=r;if(h(r)&&(p(r)||(r=f("",{text:r})),e.svg&&(r.svg=!0),r.props.key||(r.key=e.key+(y(e)?"":o)),r.props["data-o"]=null,i=s.get(r.key),v(r,i)||(i=void 0),c=g(r,i),_(r)&&p(i)&&s.delete(i.key)),h(c))return n.childNodes[o]!==c&&t(n,c),r}));for(const[e,n]of s)if(p(n)){L(n);const e=_(n);e&&r(e.parentNode,e)}return l}(N,A,D,null==w?void 0:w.children)}return N._n=(null==b?void 0:b._n)||A,N._n}const E=e=>i(e)?e:e&&"object"==typeof e?Object.keys(e).reduce(((n,t)=>`${n+=t.split(/(?=[A-Z])/).join("-").toLowerCase()}:${e[t]};`),""):"",x=n.createElement("div");function L(e){p(e)&&(e._h?(e._h.forEach((e=>{3===e.length&&o(e[2])&&e[2]()})),e._h=[]):e._i&&e._i.componentWillUnmount&&(e._i.componentWillUnmount(),delete e._i),(e._r||e).props.children.forEach((e=>{p(e)&&o(e.type)&&L(e)})),delete e._n)}function N(e){if(Array.isArray(e))return e;if(!e)return[];let n=[e];return 11===e.nodeType&&(n=Array.from(e.children)),n}function b(e){const n=N(e),r=s();return n.forEach((n=>{t(r,n),n.dataset.o||(n.dataset.o=e.key||"tryk3l")})),r}const A=function(e,n,...t){(n=n||{}).className?n.class=n.className:n.class&&(n.className=n.class),n.children=t||[];const r=f(e,n);return"svg"===e&&(r.svg=!0),c.jsx=!0,r};!function(e,n,o=!0){const i=function(e){if(d(e))return b(e);if(!c.jsx)return e;let n=e;if(p(e)){n=b(g(e));const t=[...n.childNodes];u((()=>{var n;const r=null===(n=t[0])||void 0===n?void 0:n.parentElement;r&&new MutationObserver(((n,r)=>{n.forEach((n=>{n.removedNodes.forEach((n=>{t.includes(n)&&(r.disconnect(),L(e))}))}))})).observe(r,{childList:!0})}))}return n}(e);o&&function(e,n){N(e).forEach((e=>{let t;var o;t=p(e)?e.key:null===(o=e.dataset)||void 0===o?void 0:o.o,t&&Array.from(n.children).forEach((e=>{e.dataset.o===t&&r(n,e)}))}))}(i,n),t(n,i)}(A((()=>{const[e,n]=(e=>{l.h[l.c]||(l.h[l.c]=[e,((e,n,t)=>r=>{e[n][0]=r,t&&u((()=>g(t,t._r)))})(l.h,l.c,l.v)]);const n=l.h[l.c];return l.c++,n})(1);return A("div",{onClick:()=>n(e+1)},e)}),null),n.body)}();
