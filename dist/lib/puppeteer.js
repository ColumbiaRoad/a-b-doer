"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.openPage=openPage;exports.getBrowser=getBrowser;exports.getPage=getPage;var _chalk=require("chalk");var _puppeteerCore=_interopRequireDefault(require("puppeteer-core"));var _utils=require("./utils");function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}const isTest=(0,_utils.getFlagEnv)("TEST_ENV");let initial=true;let counter=0;let loadListener=null;let browser,context;let aboutpage=null;const windowSize=[1920,1080];/**
 * Opens a browser tab and injects all required styles and scripts to the DOM
 * @param {{url: string, assetBundle: Object} config
 * @param {Boolean} [singlePage]
 */async function openPage(config,singlePage){const{url,assetBundle}=config;const page=await getPage(config,singlePage);const pageTags=[];if(assetBundle.js)pageTags.push("js");if(assetBundle.styles)pageTags.push("css");if(!singlePage){initial=true}if(!isTest){console.log(...[`#${++counter}`,initial?"Opening":"Reloading",`page ${(0,_chalk.yellow)(url)}`].concat(pageTags.length?["with custom:",pageTags]:[]))}if(aboutpage){aboutpage.close();aboutpage=null}// Remove previous listener
if(loadListener){page.off("domcontentloaded",loadListener)}// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
loadListener=async()=>{try{await page.addScriptTag({content:assetBundle.bundle})}catch(error){console.log(error.message)}if(!isTest){await page.evaluate(pageTags=>{console.log("\x1B[92m%s\x1B[0m","AB test loaded.\nInserted following assets:",pageTags.join(", "))},pageTags)}else{page.off("domcontentloaded",loadListener);loadListener=null}};page.on("domcontentloaded",loadListener);await page.goto(url);initial=false;return page}/**
 * @param {Object} config
 * @returns {Promise<import("puppeteer").Browser>}
 */async function getBrowser(config={}){// Test environment.
if(global.__BROWSER__){browser=global.__BROWSER__}// Setup puppeteer
if(!browser){console.log((0,_chalk.green)("Starting browser..."));console.log();browser=await _puppeteerCore.default.launch({headless:false,devtools:true,executablePath:config.browser,userDataDir:config.userDataDir||undefined,defaultViewport:null,args:[`--window-size=${(config.windowSize||windowSize)[0]},${(config.windowSize||windowSize)[1]}`,"--incognito"]});aboutpage=(await browser.pages())[0];aboutpage.evaluate(()=>document.body.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: rgb(255, 255, 255); display: block;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
			<path fill="none" stroke="#93dbe9" stroke-width="8" stroke-dasharray="42.76482137044271 42.76482137044271" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" stroke-linecap="round" style="transform:scale(0.8);transform-origin:50px 50px">
				<animate attributeName="stroke-dashoffset" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0;256.58892822265625"></animate>
			</path>
			</svg>`);browser.on("disconnected",()=>{process.exit(0)})}if(!context){context=await browser.createIncognitoBrowserContext()}return browser}let page;/**
 * Return a puppeteer page. If there's no page created then this also creates the page.
 * @param {Object} config
 * @param {Boolean} singlePage
 * @returns {Promise<import("puppeteer").Page>}
 */async function getPage(config,singlePage){if(singlePage&&page){return page}const browser=await getBrowser(config);let newPage;if(singlePage){page=newPage=(await browser.pages())[0];aboutpage=null}else{newPage=await context.newPage()}newPage.on("pageerror",pageerr=>{console.log("\n\x1B[31m%s\x1B[0m","Page error!");console.error(pageerr)});return newPage}