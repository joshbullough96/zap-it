// Run: node --experimental-vm-modules --test tests/app-regression.test.cjs
// Optional: ZAP_IT_BASELINE points to the pre-refactor app.js for differential checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function browser(config, width = 390, stored = {}) {
  let now = 1000, seed = 7, nextTimer = 0;
  const timers = new Map(), elements = new Map(), storage = new Map(Object.entries(stored));
  const audioEvents = [], requests = [];
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.listeners = {};
      this.style = {setProperty(name, value) {this[name] = value;}};
      const classes = new Set();
      this.classList = {add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n)};
      this.value = ''; this.checked = false; this.disabled = false; this.hidden = false; this.attributes = {};
    }
    set innerHTML(value) {this.html = value; this.children = [];}
    get innerHTML() {return this.html || '';}
    set textContent(value) {this.text = String(value);}
    get textContent() {return this.text || '';}
    setAttribute(name, value) {this.attributes[name] = String(value);}
    getAttribute(name) {return this.attributes[name] || null;}
    append(...children) {for (const child of children) {child.parent = this; this.children.push(child);}}
    addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);}
    async dispatch(type, extra = {}) {for (const fn of this.listeners[type] || []) await fn({target: this, currentTarget: this, preventDefault() {}, ...extra});}
    click() {if (!this.disabled) return this.dispatch('click');}
    querySelectorAll(selector) {return selector === 'button' ? this.children.filter(x => x.tagName === 'BUTTON') : [];}
    querySelector(selector) {return this.children.find(x => x.dataset.index === selector.match(/data-index="(\d+)"/)?.[1]) || null;}
    closest() {return get('.timer');}
    focus() {document.activeElement = this;}
    reset() {get('#player-name').value = '';}
    scrollIntoView() {}
    remove() {if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this);}
    getBoundingClientRect() {return {left: 30, top: 120, width: 90, height: 90};}
  }
  const get = selector => {if (!elements.has(selector)) elements.set(selector, new Element(selector === '#player-name' ? 'input' : 'div')); return elements.get(selector);};
  const themeInputs = ['normal','oneColor','christmas','patriotic','fall','summer'].map(value => Object.assign(new Element('input'), {value}));
  const modeInputs = ['classic','survival'].map(value => Object.assign(new Element('input'), {value}));
  for (const id of ['game-over','settings-menu','instructions-menu','leaderboard-menu']) get('#' + id).hidden = true;
  const document = {
    body: new Element('body'), head: new Element('head'), hidden: false, activeElement: null, listeners: {},
    querySelector: get,
    querySelectorAll(selector) {return selector === "input[name='theme']" ? themeInputs : selector === "input[name='game-mode']" ? modeInputs : selector === '#one-color-swatches span' ? [get('swatch1'),get('swatch2'),get('swatch3')] : [];},
    createElement: tag => new Element(tag),
    addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);},
  };
  class Audio {
    constructor() {this.listeners = {}; this.attributes = {}; this.currentTime = 0; this.paused = true;}
    set src(value) {this.attributes.src = value; this.currentTime = 0;}
    get src() {return this.attributes.src;}
    getAttribute(name) {return this.attributes[name];}
    removeAttribute(name) {delete this.attributes[name];}
    addEventListener(type, fn) {this.listeners[type] = fn;}
    play() {this.paused = false; audioEvents.push(['play',this.src]); return Promise.resolve();}
    pause() {this.paused = true;}
  }
  const param = () => ({value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}});
  class AudioContext {
    state = 'running'; currentTime = 1; destination = {};
    createOscillator() {const node = {frequency: param(), connect() {}, disconnect() {}, stop() {}, start() {audioEvents.push(['tone',node.type]);}};return node;}
    createGain() {return {gain:param(),connect(){},disconnect(){}};}
  }
  const math = Object.create(Math); math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const setTimeout = (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, at:now + delay}); return id;};
  const window = {ZAP_IT_CONFIG: config, location:{hostname:'localhost'}, innerWidth:width, innerHeight:844, AudioContext, listeners:{},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
    setTimeout, clearTimeout:id=>timers.delete(id), addEventListener(type,fn){this.listeners[type]=fn;}};
  const context = vm.createContext({window,document,Audio,Math:math,URL,URLSearchParams,console,
    performance:{now:()=>now},requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout:window.clearTimeout,
    setInterval:()=>++nextTimer,clearInterval(){},fetch:async (url,options)=>{requests.push({url,options});return {ok:true,json:async()=>options?.method === 'POST'?{ok:true,scoreId:42}:{scores:[]}};}});
  return {context, document, window, get, elements, storage, audioEvents, requests, themeInputs, modeInputs,
    async advance(milliseconds) {const end=now+milliseconds;while(true){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;now=entry[1].at;timers.delete(entry[0]);await entry[1].fn();}now=end;},
  };
}
const functions = ['startGame','tick','endGame','nextRound','handleCellClick','handleGameModeChange','handleThemeChange','handleDarkModeChange','handleOneColorChange','openSettings','closeSettings','openInstructions','closeInstructions','openLeaderboard','closeLeaderboard','handleDocumentKeydown','syncPauseState','getElapsedSeconds','handleScoreSubmit','loadLeaderboard','saveRemoteScore','fetchRemoteLeaderboard','validatePlayerName','getSortedLeaderboardScores'];
const fields = ['score','streak','wrongCount','timeLeft','target','running','pausedAt','boardLocked','scoreSaved','savedScoreId','activeGameMode','currentRunMode','matchStartedAt','matchEndedAt','finalElapsedSeconds','finalRate','activeTheme','darkMode','oneColorValue','musicEnabled','soundEffectsEnabled','musicTrackIndex','musicTracks'];
async function load({baseline = false, width = 390, config, stored} = {}) {
  if (!config) {const configContext = vm.createContext({window:{location:{hostname:'localhost'}}}); vm.runInContext(fs.readFileSync(path.join(root,'app-config.js'),'utf8'),configContext);config=plain(configContext.window.ZAP_IT_CONFIG);}
  const env = browser(config,width,stored);
  if (baseline) {
    vm.runInContext(fs.readFileSync(process.env.ZAP_IT_BASELINE,'utf8'),env.context);
    env.api = vm.runInContext('({' + functions.join(',') + ',backgroundMusic})',env.context);
    env.read = name => vm.runInContext(name,env.context);
  } else {
    const modules = new Map();
    function module(file) {if(!modules.has(file)) modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context:env.context,identifier:file}));return modules.get(file);}
    const main=module(path.join(root,'app.js'));
    await main.link((specifier, referencing)=>module(path.resolve(path.dirname(referencing.identifier),specifier)));
    await main.evaluate();
    env.api = Object.assign({}, ...[...modules.values()].map(m=>m.namespace));
    env.read = name => env.api.state[name];
  }
  env.snapshot = () => plain({state:Object.fromEntries(fields.map(name=>[name,env.read(name)])),
    board:env.get('#grid').children.map(x=>({id:x.dataset.comboId,label:x.getAttribute('aria-label'),disabled:x.disabled,shape:x.innerHTML})),
    ui:Object.fromEntries([...env.elements].map(([key,x])=>[key,{text:x.textContent,hidden:x.hidden,checked:x.checked,disabled:x.disabled}])),
    audio:{src:env.api.backgroundMusic.src,paused:env.api.backgroundMusic.paused,volume:env.api.backgroundMusic.volume},storage:[...env.storage]});
  env.match = () => env.api.handleCellClick({currentTarget:env.get('#grid').children.find(x=>x.dataset.comboId===env.read('target').id)});
  env.miss = () => env.api.handleCellClick({currentTarget:env.get('#grid').children.find(x=>x.dataset.comboId!==env.read('target').id)});
  return env;
}
async function scenario(env) {
  const snapshots=[];const record=()=>snapshots.push(env.snapshot());record();
  env.api.startGame();record();assert.equal(env.read('timeLeft'),60);assert.match(env.api.backgroundMusic.src,/Zap It/);
  assert.equal(env.get('#grid').children.filter(x=>x.dataset.comboId===env.read('target').id).length,1);
  env.match();assert.equal(env.read('score'),1);await env.advance(520);record();
  env.miss();assert.equal(env.read('wrongCount'),1);assert.equal(env.read('timeLeft'),50);record();
  env.api.openSettings();const elapsed=env.api.getElapsedSeconds();await env.advance(3000);env.api.tick();assert.equal(env.read('timeLeft'),50);assert.equal(env.api.getElapsedSeconds(),elapsed);assert(env.api.backgroundMusic.paused);record();
  env.api.handleDocumentKeydown({key:'Escape'});assert(!env.api.backgroundMusic.paused);record();
  for(const theme of env.themeInputs){env.api.handleThemeChange({target:theme});env.api.handleDarkModeChange({target:{checked:true}});env.api.handleDarkModeChange({target:{checked:false}});record();}
  env.api.handleOneColorChange({target:{value:'#aabbcc'}});record();
  env.api.backgroundMusic.currentTime=8;env.api.startGame();assert.equal(env.api.backgroundMusic.currentTime,0);record();
  for(let i=0;i<6;i++)env.miss();assert.equal(env.read('running'),false);record();
  env.get('#player-name').value='Tester';await env.api.handleScoreSubmit({preventDefault(){}});assert.equal(env.read('scoreSaved'),true);record();
  env.api.closeGameOver?.();env.get('#game-over').hidden=true;
  env.api.handleGameModeChange({target:{value:'survival'}});env.api.startGame();assert.match(env.api.backgroundMusic.src,/Neon Rain/);record();
  for(let i=0;i<4;i++)env.api.backgroundMusic.listeners.ended();assert.match(env.api.backgroundMusic.src,/Neon Rain/);record();
  env.match();await env.advance(520);env.miss();assert.equal(env.read('running'),false);assert.equal(env.read('score'),1);record();
  env.get('#player-name').value='Survivor';await env.api.handleScoreSubmit({preventDefault(){}});assert.equal(env.read('scoreSaved'),true);record();
  await env.api.openLeaderboard();await Promise.resolve();env.api.closeLeaderboard();env.api.openInstructions();env.api.closeInstructions();record();
  return snapshots;
}
for(const width of [390,1280])test(`gameplay and settings regression at width ${width}`,async()=>{
  const env=await load({width});const actual=await scenario(env);
  if(process.env.ZAP_IT_BASELINE){const before=await load({baseline:true,width});assert.deepEqual(actual,await scenario(before));}
});
test('saved preferences and sound controls survive reload',async()=>{
 const env=await load({stored:{zapItTheme:'fall',zapItDarkMode:'true',zapItMusic:'false',zapItSoundEffects:'false'}});
 assert.equal(env.read('activeTheme'),'fall');assert.equal(env.read('darkMode'),true);env.api.startGame();assert(env.api.backgroundMusic.paused);env.match();assert.equal(env.audioEvents.length,0);
 env.get('#music-toggle').checked=true;await env.get('#music-toggle').dispatch('change');assert.equal(env.storage.get('zapItMusic'),'true');assert(!env.api.backgroundMusic.paused);
 env.get('#sound-effects-toggle').checked=true;await env.get('#sound-effects-toggle').dispatch('change');assert.equal(env.storage.get('zapItSoundEffects'),'true');await env.advance(520);env.match();assert(env.audioEvents.some(x=>x[0]==='tone'));
 const reloaded=await load({stored:Object.fromEntries(env.storage)});assert.equal(reloaded.read('musicEnabled'),true);assert.equal(reloaded.read('soundEffectsEnabled'),true);
});
test('keyboard shortcuts respect text entry and dialogs',async()=>{
 const env=await load();env.api.handleDocumentKeydown({key:' ',code:'Space',target:{tagName:'INPUT'},preventDefault(){}});assert.equal(env.read('running'),false);
 env.api.handleDocumentKeydown({key:' ',code:'Space',target:env.document.body,preventDefault(){}});assert.equal(env.read('running'),true);
 const index=env.get('#grid').children.findIndex(x=>x.dataset.comboId===env.read('target').id);
 env.api.handleDocumentKeydown({key:['7','8','9','4','5','6','1','2','3'][index],target:env.document.body,preventDefault(){}});assert.equal(env.read('score'),1);
});
test('missing leaderboard configuration does not block play',async()=>{
 const env=await load({config:{}});env.api.startGame();env.match();await env.advance(520);env.api.endGame();assert.equal(env.read('score'),1);assert(env.get('#save-score-button').disabled);assert(env.get('#music-toggle').disabled);
});
test('remote requests preserve API contract and reCAPTCHA flow',async()=>{
 const env=await load({config:{leaderboardEndpoint:'https://example.test/leaderboard',recaptchaSiteKey:'test-key'}});
 env.window.grecaptcha={enterprise:{ready:fn=>fn(),execute:async()=> 'verified-token'}};
 await env.api.saveRemoteScore({gameMode:'survival',playerName:'Tester',score:5,zapsPerSecond:1,elapsedSeconds:5,wrongCount:1});
 const request=env.requests[0];assert.equal(request.url,'https://example.test/leaderboard');assert.equal(request.options.method,'POST');assert.deepEqual(JSON.parse(request.options.body),{mode:'survival',playerName:'Tester',score:5,zapsPerSecond:1,elapsedSeconds:5,wrongCount:1,recaptchaToken:'verified-token'});
 env.api.startGame();await env.api.fetchRemoteLeaderboard({includeContext:false});assert.match(env.requests[1].url,/mode=classic/);
});
test('player name validation remains enforced',async()=>{
 const env=await load();for(const name of ['a','a'.repeat(17),'bad@name','damn'])assert(env.api.validatePlayerName(name));assert.equal(env.api.validatePlayerName('Josh B'),'');
});
