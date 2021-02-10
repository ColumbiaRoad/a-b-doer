// IE11 NodeList forEach support
if (process.env.IE && !process.env.TEST_ENV) {
	if ('NodeList' in window && !NodeList.prototype.forEach) {
		NodeList.prototype.forEach = function (callback, thisArg) {
			thisArg = thisArg || window;
			for (var i = 0; i < this.length; i++) {
				callback.call(thisArg, this[i], i, this);
			}
		};
	}

	// IE11 Array.from support (very simplified)
	if (!Array.from) {
		Array.from = function (object) {
			return [].slice.call(object);
		};
	}
}

/*
Promise polyfill

(switched function declarations to function expressions so GTM's validators would be happy)

https://github.com/bramstein/promis

Copyright (c) 2014 - Bram Stein
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

 1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
 2. Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
export function Promise(cb) {
	// prettier-ignore
	if (process.env.IE && !process.env.TEST_ENV && typeof window.Promise !== 'function') {
		var ww=window;
		var wp="Promise";
		var fn=function(a) {return 'function' == typeof a;}
		var f,g=[];
		var l=function(a){g.push(a);1==g.length&&f()};
		var m=function(){for(;g.length;)g[0](),g.shift()};f=function(){setTimeout(m)};
		var n=function(a){this.a=p;this.b=void 0;this.f=[];var b=this;try{a(function(a){q(b,a)},function(a){r(b,a)})}catch(c){r(b,c)}};var p=2;
		var t=function(a){return new n(function(b,c){c(a)})};
		var u=function(a){return new n(function(b){b(a)})};
		var q=function(a,b){if(a.a==p){if(b==a)throw new TypeError;var c=!1;try{var d=b&&b.then;if(null!=b&&"object"==typeof b&&fn(d)){d.call(b,function(b){c||q(a,b);c=!0},function(b){c||r(a,b);c=!0});return}}catch(e){c||r(a,e);return}a.a=0;a.b=b;v(a)}};
		var r=function(a,b){if(a.a==p){if(b==a)throw new TypeError;a.a=1;a.b=b;v(a)}}
		var v=function(a){l(function(){if(a.a!=p)for(;a.f.length;){var b=a.f.shift(),c=b[0],d=b[1],e=b[2],b=b[3];try{0==a.a?fn(c)?e(c.call(void 0,a.b)):e(a.b):1==a.a&&(fn(d)?e(d.call(void 0,a.b)):b(a.b))}catch(h){b(h)}}})};
		n.prototype.g=function(a){return this.c(void 0,a)};n.prototype.c=function(a,b){var c=this;return new n(function(d,e){c.f.push([a,b,d,e]);v(c)})};
		var w=function(a){return new n(function(b,c){function d(c){return function(d){h[c]=d;e+=1;e==a.length&&b(h)}}var e=0,h=[];0==a.length&&b(h);for(var k=0;k<a.length;k+=1)u(a[k]).c(d(k),c)})};
		var x=function(a){return new n(function(b,c){for(var d=0;d<a.length;d+=1)u(a[d]).c(b,c)})};ww[wp]||(ww[wp]=n,ww[wp].resolve=u,ww[wp].reject=t,ww[wp].race=x,ww[wp].all=w,ww[wp].prototype.then=n.prototype.c,ww[wp].prototype["catch"]=n.prototype.g);
	}

	return new window.Promise(cb);
}
