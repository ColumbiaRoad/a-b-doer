"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.default=_default;var _path=_interopRequireDefault(require("path"));var _fs=_interopRequireDefault(require("fs"));var _pluginutils=require("@rollup/pluginutils");function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _default(testPath){if(!testPath){console.log("Test folder is missing");process.exit()}let entryFile="";try{if(!_fs.default.lstatSync(testPath).isDirectory()){let testDir=_path.default.dirname(testPath);entryFile=testPath.replace(testDir,".");testPath=testDir}}catch(error){console.error(error);process.exit()}if(!_fs.default.existsSync(testPath)){console.log("Test folder does not exist",testPath);process.exit()}const testConfig={};const configPath=_path.default.resolve(process.env.INIT_CWD,"config.json");const configPathJs=_path.default.resolve(process.env.INIT_CWD,"config.js");if(_fs.default.existsSync(configPath)){Object.assign(testConfig,require(configPath))}else if(_fs.default.existsSync(configPathJs)){Object.assign(testConfig,require(configPathJs))}let hasBuildSpec=false;try{const parentSpecFile=_path.default.join(testPath,"..","buildspec.json");if(_fs.default.existsSync(parentSpecFile)){hasBuildSpec=true;Object.assign(testConfig,require(parentSpecFile))}const specFile=_path.default.join(testPath,"buildspec.json");if(_fs.default.existsSync(specFile)){hasBuildSpec=true;Object.assign(testConfig,require(specFile))}}catch(error){}if(!Object.keys(testConfig).length||!hasBuildSpec){return null}if(!entryFile){if(testConfig.entry){entryFile=testConfig.entry}else{const files=_fs.default.readdirSync(testPath,{encoding:"utf8"});const indexFile=files.find(file=>/index\.(jsx?|tsx?|(le|sa|sc|c)ss)$/.test(file));if(indexFile){entryFile=indexFile}else{entryFile=files.find(file=>/styles?\.(le|sa|sc|c)ss$/.test(file))}}}let entryPart=entryFile;if(entryFile){entryFile=_path.default.resolve(testPath,entryFile)}if(!entryFile)return null;const filter=(0,_pluginutils.createFilter)(testConfig.include,testConfig.exclude);if(!filter(entryFile)){return null}if(testConfig.url&&!Array.isArray(testConfig.url)){testConfig.url=[testConfig.url]}return{...testConfig,testPath,entryFile,entryPart,entryFileExt:entryFile.split(".").pop()}}