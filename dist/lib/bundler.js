"use strict";Object.defineProperty(exports,"__esModule",{value:true});var _exportNames={bundler:true};exports.bundler=bundler;var _path=_interopRequireDefault(require("path"));var _fs=_interopRequireDefault(require("fs"));var _rollup=require("rollup");var _pluginNodeResolve=_interopRequireDefault(require("@rollup/plugin-node-resolve"));var _pluginBabel=_interopRequireDefault(require("@rollup/plugin-babel"));var _rollupPluginTerser=require("rollup-plugin-terser");var _rollupPluginStyles=_interopRequireDefault(require("rollup-plugin-styles"));var _stringHash=_interopRequireDefault(require("string-hash"));var _autoprefixer=_interopRequireDefault(require("autoprefixer"));var _pluginAlias=_interopRequireDefault(require("@rollup/plugin-alias"));var _pluginReplace=_interopRequireDefault(require("@rollup/plugin-replace"));var _rollupPluginEjs=_interopRequireDefault(require("rollup-plugin-ejs"));var _pluginCommonjs=_interopRequireDefault(require("@rollup/plugin-commonjs"));var _puppeteer=require("./puppeteer");Object.keys(_puppeteer).forEach(function(key){if(key==="default"||key==="__esModule")return;if(Object.prototype.hasOwnProperty.call(_exportNames,key))return;if(key in exports&&exports[key]===_puppeteer[key])return;Object.defineProperty(exports,key,{enumerable:true,get:function(){return _puppeteer[key]}})});var _rollupPluginInlineSvg=_interopRequireDefault(require("rollup-plugin-inline-svg"));var _rollupPluginSvgHyperscript=_interopRequireDefault(require("rollup-plugin-svg-hyperscript"));var _pluginImage=_interopRequireDefault(require("@rollup/plugin-image"));var _rollupChunkImage=_interopRequireDefault(require("./plugins/rollup-chunk-image"));var _browserslist=_interopRequireDefault(require("browserslist"));var _utils=require("./utils");var _chalk=_interopRequireDefault(require("chalk"));function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}const browsers=(0,_browserslist.default)();const supportIE=!!browsers.find(b=>b.startsWith("ie"));/**
 * Config defaults
 */let config={chunkImages:true,minify:true,modules:true,preact:false,watch:false};const rootDir=_path.default.join(__dirname,"..","..");async function bundler(testConfig){let{entryFile,testPath,entry,entryPart}=testConfig;if(!entryFile&&entry){entryFile=entry;if(entry.startsWith(".")){entryFile=_path.default.join(testPath,entry)}}if(!entryPart&&entry){entryPart=entry}if(!entryFile||!testPath){throw new Error("Entry file or test path is missing")}const buildDir=_path.default.join(testPath,".build");// Ensure build folder
try{if(!_fs.default.existsSync(buildDir)){_fs.default.mkdirSync(buildDir)}}catch(error){}testConfig={...config,...testConfig,buildDir};const{minify,preact,modules,id,chunkImages,watch}=testConfig;const babelConfig={babelrc:false,presets:[["@babel/env",{modules:false}]],plugins:["transform-async-to-promises","@babel/plugin-proposal-class-properties","@babel/plugin-proposal-optional-chaining","@babel/plugin-proposal-nullish-coalescing-operator",["@babel/plugin-transform-react-jsx",{pragma:"h",pragmaFrag:preact?"Fragment":"hf"}],["@emotion/babel-plugin-jsx-pragmatic",preact?{module:"preact",import:"h, Fragment",export:"h, Fragment"}:{module:_path.default.join(rootDir,"/src/jsx"),import:"h, hf",export:"h, hf"}]].filter(Boolean),exclude:/core-js/,extensions:[".js",".jsx"]};// Bundler behaves a little bit differently when there's style file as an entry.
let stylesOnly=/\.(le|sa|sc|c)ss$/.test(entryFile);if(!entryFile){throw new Error("Couldn't find entry file")}let styleFile=entryPart.split(".");styleFile.pop();styleFile.push("css");styleFile=styleFile.join(".");const cwd=process.cwd();const inputOptions={input:[entryFile],plugins:[(0,_pluginNodeResolve.default)({extensions:babelConfig.extensions,moduleDirectories:["node_modules",_path.default.join(rootDir,"node_modules")]}),(0,_pluginBabel.default)({...babelConfig,babelHelpers:"bundled"}),(0,_pluginCommonjs.default)({transformMixedEsModules:true}),(0,_rollupPluginStyles.default)({mode:["extract",_path.default.basename(styleFile)],minimize:minify,modules:modules!==false?{generateScopedName:minify?(name,file)=>{const parentPath=_path.default.dirname(_path.default.dirname(file));file=file.replace(parentPath,"");return"t"+(0,_stringHash.default)(file).toString(36).substr(0,4)+"_"+name}:"t_[name]_[local]__[hash:4]"}:undefined,plugins:[_autoprefixer.default],url:{inline:true},alias:{scss:_path.default.join(cwd,"/scss"),sass:_path.default.join(cwd,"/sass"),less:_path.default.join(cwd,"/less"),styles:_path.default.join(cwd,"/styles"),css:_path.default.join(cwd,"css"),"@":cwd}}),(0,_pluginAlias.default)({entries:[{find:/^@\/(.*)/,replacement:_path.default.join(cwd,"$1")},{find:"a-b-doer/hooks",replacement:_path.default.join(rootDir,"hooks")},{find:"a-b-doer",replacement:_path.default.join(rootDir,"main")},{find:"react",replacement:"preact/compat"},{find:"react-dom",replacement:"preact/compat"}]}),(0,_rollupPluginEjs.default)({include:["**/*.ejs","**/*.html"]}),(0,_pluginReplace.default)({"process.env.preact":(0,_utils.getFlagEnv)("PREACT")??!!preact,"process.env.NODE_ENV":JSON.stringify("production"),"process.env.IE":(0,_utils.getFlagEnv)("IE")??supportIE,"process.env.TEST_ID":JSON.stringify(id||"t"+((0,_utils.hashf)(_path.default.dirname(testPath.replace(process.env.INIT_CWD,""))).toString(36)||"-default"))}),(0,_pluginImage.default)({exclude:["**/*.svg"]}),(0,_rollupChunkImage.default)(chunkImages),preact?(0,_rollupPluginSvgHyperscript.default)({importDeclaration:"import {h} from \"preact\"",pragma:"h",transformPropNames:false}):(0,_rollupPluginInlineSvg.default)({removeSVGTagAttrs:false})],watch:false};const outputOptions={dir:buildDir,assetFileNames:_path.default.basename(styleFile),strict:false,format:"iife",exports:"named",name:_path.default.basename(entryFile).split(".")[0],plugins:[minify&&(0,_rollupPluginTerser.terser)(Object.assign({mangle:{toplevel:true}},chunkImages&&{compress:{evaluate:false}}))].filter(Boolean)};let bundle;try{// First try to create bundle before opening the browser.
bundle=await(0,_rollup.rollup)(inputOptions);await bundle.write(outputOptions)}catch(error){console.log(_chalk.default.red("\nBundle error!"));throw new Error(error.message)}const createAssetBundle=()=>{let js="";let styles="";try{// Remove dummy js generated by rollup
if(stylesOnly){let jsFile=entryPart.split(".");jsFile.pop();jsFile.push("js");_fs.default.unlinkSync(_path.default.resolve(buildDir,jsFile.join(".")))}// Include the js content
else{js=_fs.default.readFileSync(_path.default.resolve(buildDir,entryPart.replace(/\.jsx$/,".js")),"utf8")}let styleFile=entryPart.split(".");styleFile.pop();styleFile.push("css");styles=_fs.default.readFileSync(_path.default.resolve(buildDir,styleFile.join(".")),"utf8")}catch(error){}let assetBundle=js;if(styles){assetBundle="(function(){"+"var s=document.createElement('style');s.innerText='"+styles.replace(/[\r\n]/g," ").replace(/'/g,"\\'")+"';"+"document.head.appendChild(s);"+js+"})()"}_fs.default.writeFileSync(_path.default.resolve(buildDir,".bundle.js"),assetBundle);return{bundle:assetBundle,styles:!!styles,js:!!js}};let assetBundle=createAssetBundle(buildDir,entryPart);// Close the bundle if watch option is not set
if(!watch){// closes the bundle
await bundle.close()}// Otherwise start rollup watcher
else{const watcher=(0,_rollup.watch)({...inputOptions,output:outputOptions,watch:{buildDelay:300,exclude:[_path.default.join(testPath,".build","**")]}});let page;watcher.on("event",async event=>{// Bundled successfully.
if(event.code==="END"&&bundle){await bundle.generate(outputOptions);assetBundle=createAssetBundle(buildDir,entryPart);page=await(0,_puppeteer.openPage)({...testConfig,assetBundle},true)}// Error in bundle process.
else if(event.code==="ERROR"){console.log(_chalk.default.red("\nBundle error!"));console.error(event.error.message,"\n");if(page){await page.evaluate(msg=>{// Chalk doesn't work in browser.
console.log("\n\x1B[31m%s\x1B[0m","Bundle error!");console.warn(msg,"\n")},event.error.message)}}// Process started
else if(event.code==="BUNDLE_START"){if(page){await page.evaluate(()=>{// Chalk doesn't work in browser.
console.log("\x1B[92m%s\x1B[0m","Source code changed. Starting bundler...")})}}// End of bundle process, close the bundle
else if(event.code==="BUNDLE_END"){await event.result.close()}// event.code can be one of:
//   START        — the watcher is (re)starting
//   BUNDLE_START — building an individual bundle
//   BUNDLE_END   — finished building a bundle
//   END          — finished building all bundles
//   ERROR        — encountered an error while bundling
})}return{...testConfig,assetBundle}}