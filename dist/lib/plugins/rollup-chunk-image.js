"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.default=chunkImage;const pluginutils=require("@rollup/pluginutils");const path=require("path");const defaults={size:150,exclude:null,include:null};const mimeTypes={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".gif":"image/gif",".webp":"image/webp"};/**
 * Rollup plugin that splits image plugin output base64 string into multiple chunks.
 * Google Tag Manager has a validator in HTML tags that checks that there are not too many contiguous non-whitespace characters.
 *
 * @param {typeof defaults} opts
 */function chunkImage(opts={}){if(opts===true){opts={}}else if(typeof opts==="number"){opts={size:opts}}const options=Object.assign({},defaults,opts);const filter=pluginutils.createFilter(options.include,options.exclude);const parentName="image";return{name:"chunk-image",buildStart({plugins}){const parentPlugin=plugins.find(plugin=>plugin.name===parentName);if(!parentPlugin){// or handle this silently if it is optional
throw new Error(`This plugin depends on the "${parentName}" plugin.`)}},transform:function transform(/** @type {string}*/code,id){// Disabled by config?
if(opts===false){return null}if(!filter(id)){return null}let mime=mimeTypes[path.extname(id)];if(!mime){// not an image
return null}// Skip all other output types than string constants (for now)
if(code.indexOf("const img = \"data:")!==0){return null}const firstQuot=code.indexOf("\"")+1;const lastQuot=code.indexOf("\"",firstQuot);const start=code.substr(0,firstQuot);const end=code.substr(lastQuot);const parts=code.replace(start,"").replace(end,"").match(new RegExp(`[^]{1,${options.size}}`,"g"));return start+parts.join("\" + \"")+end}}}