"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.preactDebug=preactDebug;var _fs=require("fs");let isRoot=false;function preactDebug(){return{name:"preact-debug",async resolveId(source,importer){if(!importer){const resolution=await this.resolve(source,undefined,{skipSelf:true});if(!resolution)return null;isRoot=true;return resolution}isRoot=false;return null},load(id){if(isRoot&&process.env.PREACT&&process.env.PREVIEW){const contents=(0,_fs.readFileSync)(id).toString();return`import "preact/debug";\n${contents};`}return null}}}