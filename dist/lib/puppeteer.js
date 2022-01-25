"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.openPage=openPage;exports.getBrowser=getBrowser;exports.getPage=getPage;var _chalk=require("chalk");var _puppeteerCore=_interopRequireDefault(require("puppeteer-core"));var _utils=require("./utils");function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}const isTest=(0,_utils.getFlagEnv)("TEST_ENV");let initial=true;let counter=0;let loadListener=null;let browser,context;let aboutpage=null;async function openPage(config,singlePage){const{url:urls,assetBundle,onBefore,onLoad}=config;const url=getDefaultUrl(urls);let urlAfterLoad=url;const page=await getPage(config,singlePage);if(onBefore){await onBefore(page)}const pageTags=[];if(assetBundle.js)pageTags.push("js");if(assetBundle.styles)pageTags.push("css");let text=initial?"Opening":"Reloading";if(!singlePage){text="Opening"}if(!isTest){console.log(...[`#${++counter}`,text,`page ${(0,_chalk.yellow)(url)}`].concat(pageTags.length?["with custom:",pageTags]:[]))}if(isTest||config.debug){page.on("console",message=>console.log("LOG: ",message.text())).on("pageerror",({message})=>console.log("ERR: ",message))}if(aboutpage){aboutpage.close();aboutpage=null}page._pageBindings.set("isOneOfBuildspecUrls",url=>isOneOfBuildspecUrls(url,urls));if(loadListener){page.off("domcontentloaded",loadListener)}loadListener=async()=>{try{page._pageBindings.set("isOneOfBuildspecUrls",url=>isOneOfBuildspecUrls(url,urls));if(!isTest&&config.historyChanges){await page.evaluate(bundle=>{function _appendVariantScripts(){setTimeout(()=>{if(typeof window.isOneOfBuildspecUrls!=="function"||!window.isOneOfBuildspecUrls(location.href)){return}const node=document.createElement("script");node.innerHTML=bundle;document.head.appendChild(node)},10)}window.onpopstate=function(){_appendVariantScripts()};var pushState=history.pushState;history.pushState=function(state){if(typeof history.onpushstate=="function"){history.onpushstate({state:state})}_appendVariantScripts();return pushState.apply(history,arguments)}},assetBundle.bundle)}if(!initial&&!isOneOfBuildspecUrls(page.url(),urls)){return}if(config.activationEvent){await page.evaluate((bundle,activationEvent,pageTags,TEST_ID)=>{function _appendVariantScripts(){console.log("\x1B[92m%s\x1B[0m","AB test loaded.\nInserted following assets:",pageTags.join(", "));document.head.querySelectorAll(`[data-id="${TEST_ID}"]`).forEach(node=>node.remove());const node=document.createElement("script");node.dataset.id=TEST_ID;node.innerHTML=bundle;document.head.appendChild(node)}function _alterDataLayer(dataLayer){console.log("\x1B[92m%s\x1B[0m","Added dataLayer listener for",activationEvent);const oldPush=dataLayer.push;dataLayer.push=function(...args){args.forEach(({event})=>{if(event===activationEvent){_appendVariantScripts()}});oldPush.apply(dataLayer,args)}}if(!window.dataLayer){window.dataLayer=[]}_alterDataLayer(window.dataLayer)},assetBundle.bundle,config.activationEvent,pageTags,process.env.TEST_ID)}else{try{await page.addScriptTag({content:assetBundle.bundle})}catch(error){console.log(error.message)}if(!isTest){await page.evaluate(pageTags=>{console.log("\x1B[92m%s\x1B[0m","AB test loaded.\nInserted following assets:",pageTags.join(", "))},pageTags)}}if(isTest){page.off("domcontentloaded",loadListener);loadListener=null}}catch(error){if(config.debug){console.log(error.message)}}};page.on("domcontentloaded",loadListener);await page.goto(url,{waitUntil:"networkidle0"});if(onLoad){await onLoad(page)}initial=false;urlAfterLoad=page.url();if(!isOneOfBuildspecUrls(urlAfterLoad,urls)){urls.push(urlAfterLoad)}return page}function isOneOfBuildspecUrls(url,urls=[]){return Boolean(urls.find(cur=>{if(url===cur){return true}if(typeof cur==="string"&&cur[0]==="/"&&cur[cur.length-1]==="/"){const re=new RegExp(cur.substr(1,cur.length-2));return re.test(url)}return false}))}function getDefaultUrl(urls){const url=urls.find(cur=>{if(typeof cur==="string"&&cur[0]==="/"&&cur[cur.length-1]==="/"){return false}return true});if(!url){console.error("No proper default URL found. RegExp URL cannot be the default URL.");console.error("Buildspec URLs:");console.error((0,_chalk.yellow)(urls.join("\n")));process.exit()}return url}async function getBrowser(config={}){if(global.__BROWSER__){browser=global.__BROWSER__}if(!browser){console.log((0,_chalk.green)("Starting browser..."));if(config.debug){console.log("With config:");console.log(config)}console.log();browser=await _puppeteerCore.default.launch({headless:Boolean(config.headless),devtools:Boolean(config.devtools),executablePath:config.browser,userDataDir:config.userDataDir||undefined,defaultViewport:null,ignoreDefaultArgs:["--disable-extensions"],args:[`--window-size=${config.windowSize[0]},${config.windowSize[1]}`,"--incognito"]});aboutpage=(await browser.pages())[0];aboutpage.evaluate(()=>document.body.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: rgb(255, 255, 255); display: block;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
			<path fill="none" stroke="#93dbe9" stroke-width="8" stroke-dasharray="42.76482137044271 42.76482137044271" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" stroke-linecap="round" style="transform:scale(0.8);transform-origin:50px 50px">
				<animate attributeName="stroke-dashoffset" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0;256.58892822265625"></animate>
			</path>
			</svg>`);browser.on("disconnected",()=>{process.exit(0)})}if(!context){context=await browser.createIncognitoBrowserContext()}return browser}let page;async function getPage(config,singlePage){if(singlePage&&page){return page}const browser=await getBrowser(config);let newPage;if(singlePage){page=newPage=(await browser.pages())[0];aboutpage=null}else{newPage=await context.newPage()}if(config.debug){newPage.on("console",msg=>{console.log(msg.text())})}newPage.on("pageerror",pageerr=>{console.log("\n\x1B[31m%s\x1B[0m","Page error!");console.error(pageerr)});return newPage}