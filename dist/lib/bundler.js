"use strict";Object.defineProperty(exports,"__esModule",{value:true});var _exportNames={bundler:true};exports.bundler=bundler;var _path=_interopRequireDefault(require("path"));var _fs=_interopRequireDefault(require("fs"));var _rollup=require("rollup");var _pluginNodeResolve=_interopRequireDefault(require("@rollup/plugin-node-resolve"));var _pluginBabel=_interopRequireDefault(require("@rollup/plugin-babel"));var _rollupPluginTerser=require("rollup-plugin-terser");var _rollupPluginStyles=_interopRequireDefault(require("rollup-plugin-styles"));var _stringHash=_interopRequireDefault(require("string-hash"));var _autoprefixer=_interopRequireDefault(require("autoprefixer"));var _pluginAlias=_interopRequireDefault(require("@rollup/plugin-alias"));var _pluginReplace=_interopRequireDefault(require("@rollup/plugin-replace"));var _rollupPluginEjs=_interopRequireDefault(require("rollup-plugin-ejs"));var _pluginCommonjs=_interopRequireDefault(require("@rollup/plugin-commonjs"));var _puppeteer=require("./puppeteer");Object.keys(_puppeteer).forEach(function(key){if(key==="default"||key==="__esModule")return;if(Object.prototype.hasOwnProperty.call(_exportNames,key))return;if(key in exports&&exports[key]===_puppeteer[key])return;Object.defineProperty(exports,key,{enumerable:true,get:function(){return _puppeteer[key]}})});var _rollupPluginInlineSvg=_interopRequireDefault(require("rollup-plugin-inline-svg"));var _rollupPluginSvgHyperscript=_interopRequireDefault(require("rollup-plugin-svg-hyperscript"));var _pluginImage=_interopRequireDefault(require("@rollup/plugin-image"));var _rollupChunkImage=_interopRequireDefault(require("./plugins/rollup-chunk-image"));var _browserslist=_interopRequireDefault(require("browserslist"));var _utils=require("./utils");var _chalk=_interopRequireDefault(require("chalk"));var _rimraf=_interopRequireDefault(require("rimraf"));var _glob=require("glob");var _preactDebugPlugin=require("./preact-debug-plugin");function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}const browsers=(0,_browserslist.default)();const supportIE=!!browsers.find(b=>b.startsWith("ie"));const rootDir=_path.default.join(__dirname,"..","..");async function bundler(testConfig){let{entryFile,testPath,entry,entryPart,preview=false}=testConfig;if(!entryFile&&entry){entryFile=entry;if(entry.startsWith(".")){entryFile=_path.default.join(testPath,entry)}}if(!entryPart&&entry){entryPart=entry}if(!entryFile||!testPath){throw new Error("Entry file or test path is missing")}const buildDir=_path.default.join(testPath,testConfig.buildDir);testConfig.buildDir=buildDir;try{if(!_fs.default.existsSync(buildDir)){_fs.default.mkdirSync(buildDir)}}catch(error){}const{minify:configMinify,preact,modules,id,chunkImages,watch,bundler:bundlerConfig={}}=testConfig;const minify=configMinify??!watch;const babelConfig={babelrc:false,presets:[["@babel/env",{modules:false}]],plugins:["transform-async-to-promises","@babel/plugin-proposal-class-properties","@babel/plugin-proposal-optional-chaining","@babel/plugin-proposal-nullish-coalescing-operator",["@babel/plugin-transform-react-jsx",{pragma:"h",pragmaFrag:preact?"Fragment":"hf"}],["@emotion/babel-plugin-jsx-pragmatic",preact?{module:"preact",import:"h, Fragment",export:"h, Fragment"}:{module:_path.default.join(rootDir,"/src/jsx"),import:"h, hf",export:"h, hf"}]].filter(Boolean),exclude:/core-js/,extensions:[".js",".jsx"]};let stylesOnly=/\.(le|sa|sc|c)ss$/.test(entryFile);if(!entryFile){throw new Error("Couldn't find entry file")}const cwd=process.cwd();const{plugins=[],input:_i,watch:_w,output={},...restBundlerConfig}=bundlerConfig;process.env.PREACT=process.env.preact=(0,_utils.getFlagEnv)("PREACT")??!!preact;process.env.NODE_ENV=JSON.stringify("production");process.env.IE=(0,_utils.getFlagEnv)("IE")??supportIE;process.env.PREVIEW=Boolean(watch||preview);process.env.TEST_ENV=(0,_utils.getFlagEnv)("TEST_ENV")||false;const inputOptions={input:[entryFile],plugins:getPluginsConfig([["preact-debug"],["alias",{entries:[{find:/^@\/(.*)/,replacement:_path.default.join(cwd,"$1")},{find:"a-b-doer/hooks",replacement:_path.default.join(rootDir,"hooks")},{find:"a-b-doer",replacement:_path.default.join(rootDir,"main")},{find:"react",replacement:"preact/compat"},{find:"react-dom",replacement:"preact/compat"}]}],["node-resolve",{extensions:babelConfig.extensions,moduleDirectories:["node_modules",_path.default.join(rootDir,"node_modules")]}],["babel",{...babelConfig,babelHelpers:"bundled"}],["commonjs",{transformMixedEsModules:true}],["styles",{mode:"extract",minimize:minify,modules:modules!==false?{generateScopedName:minify?(name,file)=>{return"t"+(0,_stringHash.default)((0,_utils.unifyPath)(file)).toString(36).substr(0,4)+"-"+name}:"t_[dir]_[name]_[local]__[hash:4]"}:undefined,plugins:[_autoprefixer.default],url:{inline:true},alias:{scss:_path.default.join(cwd,"/scss"),sass:_path.default.join(cwd,"/sass"),less:_path.default.join(cwd,"/less"),styles:_path.default.join(cwd,"/styles"),css:_path.default.join(cwd,"css"),"@":cwd}}],["ejs",{include:["**/*.ejs","**/*.html"]}],["replace",{preventAssignment:true,values:{"process.env.PREACT":process.env.PREACT,"process.env.preact":process.env.PREACT,"process.env.NODE_ENV":JSON.stringify("production"),"process.env.IE":process.env.IE,"process.env.PREVIEW":Boolean(watch||preview),"process.env.TEST_ENV":process.env.TEST_ENV,"process.env.TEST_ID":JSON.stringify(id||"t"+((0,_utils.hashf)(_path.default.dirname((0,_utils.unifyPath)(testPath))).toString(36)||"-default"))}}],["image",{exclude:["**/*.svg"]}],(0,_rollupChunkImage.default)(chunkImages),preact?["svg-hyperscript",{importDeclaration:"import {h} from \"preact\"",pragma:"h",transformPropNames:false}]:["inline-svg",{removeSVGTagAttrs:false}]],[...plugins]),watch:false,...restBundlerConfig};const sourceMapOptions=watch&&testConfig.sourcemap!==false?{sourcemap:"inline",sourcemapPathTransform:(relativeSourcePath,sourcemapPath)=>{return"file:///"+_path.default.resolve(_path.default.dirname(sourcemapPath),relativeSourcePath)}}:{};const outputOptions={dir:buildDir,assetFileNames:"[name].css",strict:false,format:"iife",exports:"named",name:_path.default.basename(entryFile).split(".")[0],plugins:[minify&&(0,_rollupPluginTerser.terser)(Object.assign({mangle:{toplevel:true}},chunkImages&&{compress:{evaluate:false}}))].filter(Boolean),...sourceMapOptions,...output};let bundle;let bundleOutput={output:[]};if(outputOptions.entryFileNames&&!output.assetFileNames){outputOptions.assetFileNames=getFileAs(outputOptions.entryFileNames,"css")}const clearHashedAssets=()=>{if(/\[hash(]|:)/.test(outputOptions.entryFileNames)){const files=_glob.glob.sync("**/*.?(js|css)",{cwd:buildDir,dot:true});files.forEach(file=>{(0,_rimraf.default)(`${buildDir}/${file}`,err=>{if(err)console.error(err)})})}};if(!watch){clearHashedAssets()}try{bundle=await(0,_rollup.rollup)(inputOptions);bundleOutput=await bundle.write(outputOptions)}catch(error){console.log(_chalk.default.red("\nBundle error!"));throw new Error(error.message)}let mainChunk=bundleOutput.output[0];let cssChunk=bundleOutput.output[1];const fnIifeCheck=/^(\(|function)/;const createAssetBundle=()=>{var _mainChunk,_cssChunk;let js=(_mainChunk=mainChunk)===null||_mainChunk===void 0?void 0:_mainChunk.code;let styles=(_cssChunk=cssChunk)===null||_cssChunk===void 0?void 0:_cssChunk.source;let sourcemap="";if(stylesOnly){_fs.default.unlink(_path.default.resolve(buildDir,mainChunk.fileName),err=>{})}else{var _mainChunk$map;sourcemap=(_mainChunk$map=mainChunk.map)===null||_mainChunk$map===void 0?void 0:_mainChunk$map.toUrl();if(sourcemap){sourcemap="\n//# sourceMappingURL="+sourcemap}if(fnIifeCheck.test(js)&&outputOptions.format==="iife"){js="!"+js;_fs.default.writeFile(_path.default.resolve(buildDir,mainChunk.fileName),js+sourcemap,err=>{})}}let assetBundle=js;if(styles){assetBundle=(js?"!(function(){"+js+"})();":"")+"!(function(){"+"var __a,__s,__f=function(){"+"if(__a){return;}"+"__a=1;"+"__s=document.createElement('style');__s.innerHTML='"+styles.replace(/([\r\n\s]+)/g," ").replace(/'/g,"\\'")+"';"+"document.head.appendChild(__s);"+"};"+(testConfig.appendStyles?"__f();":"window._addStyles=__f;")+"})();"+sourcemap}else if(assetBundle&&fnIifeCheck.test(assetBundle)&&outputOptions.format==="iife"){assetBundle="!"+assetBundle}_fs.default.writeFile(_path.default.resolve(buildDir,getFileAs(mainChunk.fileName,"bundle.js")),assetBundle,err=>err&&console.error(err));return{bundle:assetBundle,styles:!!styles,js:!!js}};let assetBundle;let watcher;if(!watch){assetBundle=createAssetBundle(buildDir,entryPart);await bundle.close()}else{const watcherConfig={...inputOptions,output:outputOptions,watch:{buildDelay:300,exclude:[_path.default.join(testConfig.buildDir,"**")]}};if(testConfig.debug){console.log("Starting watcher, with config");console.log(watcherConfig)}watcher=(0,_rollup.watch)(watcherConfig);let page;let hasError=false;watcher.on("event",async event=>{if(event.code==="ERROR"){console.log(_chalk.default.red("\nBundle error!"));console.error(event.error.message,"\n");hasError=true;if(page){await page.evaluate(msg=>{console.log("\n\x1B[31m%s\x1B[0m","Bundle error!");console.warn(msg,"\n")},event.error.message)}}else if(event.code==="BUNDLE_START"){clearHashedAssets();hasError=false;if(page){await page.evaluate(()=>{console.log("\x1B[92m%s\x1B[0m","Source code changed. Starting bundler...")})}}else if(event.code==="BUNDLE_END"){if(hasError){return}bundleOutput=await event.result.generate(outputOptions);mainChunk=bundleOutput.output[0];cssChunk=bundleOutput.output[1];assetBundle=createAssetBundle(buildDir,entryPart);page=await(0,_puppeteer.openPage)({...testConfig,assetBundle},true);hasError=false;await event.result.close()}})}return{...testConfig,assetBundle,watcher}}function getFileAs(entryPart,ext){const entryPathArrWithoutExt=entryPart.split(".").slice(0,-1);return entryPathArrWithoutExt.concat(ext).join(".")}function getPluginsConfig(defaults,override=[]){const fns={alias:_pluginAlias.default,"node-resolve":_pluginNodeResolve.default,babel:_pluginBabel.default,styles:_rollupPluginStyles.default,replace:_pluginReplace.default,ejs:_rollupPluginEjs.default,commonjs:_pluginCommonjs.default,"inline-svg":_rollupPluginInlineSvg.default,"svg-hyperscript":_rollupPluginSvgHyperscript.default,image:_pluginImage.default,"preact-debug":_preactDebugPlugin.preactDebug};return defaults.map(plugin=>{if(!Array.isArray(plugin))return plugin;const[key,options]=plugin;const fn=fns[key];const overridePlugin=override.find(op=>{if(!Array.isArray(op))return false;return op[0]===key});if(overridePlugin){override.splice(override.indexOf(overridePlugin),1);if(typeof overridePlugin[1]==="function"){return fn(overridePlugin[1](options))}else{return fn(overridePlugin[1])}}return fn(options)}).concat(override.map(plugin=>{let fn=plugin;if(Array.isArray(fn)){if(typeof fn[1]==="function"){return fn[1]()}else{console.error(_chalk.default.red(`There's no default plugin for ${_chalk.default.bold(fn[0])}. Can't call default plugin with given argument `,fn[1]));console.error(_chalk.default.red(`Custom plugins should be inserted as objects or as a [string, function] tuple, got`),fn)}}if(typeof fn==="function"){return fn()}return fn}))}