import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {normalizeProfile,normalizeContact,normalizeCV,normalizeEntries,normalizePublications,normalizeResearch,normalizeSkills,normalizeAwards,isHomePublication} from '../src/lib/normalize.ts';
import {authorSegments} from '../src/lib/authors.ts';
const authorText='A. Smith, Juhyung Kim*, J. Kim, J. T. Kim; Equal contribution; J. Kimball, NotJuhyung Kim';
const segments=authorSegments(authorText);
assert.equal(segments.map(s=>s.text).join(''),authorText);
assert.deepEqual(segments.filter(s=>s.emphasized).map(s=>s.text),['Juhyung Kim','J. Kim','J. T. Kim','Equal contribution']);
assert.deepEqual(authorSegments(null),[]);
for(const image of [undefined,null,'','   '])assert.equal(normalizeAwards({entries:[{title:'Award',image}]}).entries[0].image,'');
for(const empty of [undefined,null,'',{}]){
 assert.deepEqual(normalizeProfile(empty).interests,[]);
 assert.equal(normalizeProfile(empty).portrait,'');
 assert.equal(normalizeContact(empty).email,'');
 assert.equal(normalizeCV(empty).file,'');
 for(const normalize of [normalizePublications,normalizeResearch,normalizeSkills])assert.deepEqual(normalize(empty),[]);
 assert.deepEqual(normalizeEntries(empty).entries,[]);
}
assert.deepEqual(normalizeProfile({interests:[null,'','Robotics'],introduction:'User text'}).interests,['Robotics']);
assert.equal(normalizeProfile({introduction:'User text'}).introduction,'User text');
const partial=normalizePublications({entries:[null,{}, {title:'Draft',authors:null,year:'',id:''}, {id:'publication-1',title:'Existing',year:2026}]});
assert.equal(partial.length,2);assert.equal(partial[0].title,'Existing');assert.equal(partial[1].authors,'');assert.equal(partial[1].type,'Other publications');assert.equal(new Set(partial.map(p=>p.id)).size,2);
assert.deepEqual(normalizeResearch({entries:[{title:'Draft',media:[null,{}, {image:''}],related:null} ]})[0].media,[]);
assert.equal(normalizeSkills({entries:[{name:'Draft',category:null} ]})[0].category,'Other skills');
for (const role of [undefined,null,'','First Author','Co-first Author','Co-author']) {
 const p=normalizePublications({entries:[{title:'Role test',authorRole:role,featured:true}]})[0];
 assert.equal(isHomePublication(p),role==='First Author'||role==='Co-first Author');
}
console.log('PASS: optional-field normalization, partial entries, sort order, fallback IDs.');
// Integration tests always modify isolated copies, never the actual CMS data.
const hashSource=()=>JSON.stringify(fs.readdirSync('src/data').sort().map(name=>[name,fs.readFileSync('src/data/'+name,'utf8')]));
const before=hashSource();
fs.mkdirSync('.tools',{recursive:true});
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'juhyung-cms-regression-'));
for(const folder of ['src','public','scripts'])fs.cpSync(folder,path.join(fixture,folder),{recursive:true});
for(const file of ['astro.config.mjs','tsconfig.json','package.json','.pages.yml'])fs.copyFileSync(file,path.join(fixture,file));
fs.symlinkSync(path.resolve('node_modules'),path.join(fixture,'node_modules'),'junction');
const put=(name,data)=>fs.writeFileSync(path.join(fixture,'src/data',name+'.json'),JSON.stringify(data));
const astro=path.resolve('node_modules/astro/bin/astro.mjs');
function run(args){const result=spawnSync(process.execPath,args,{cwd:fixture,encoding:'utf8'});if(result.status!==0){console.error(result.stdout,result.stderr);throw Error('Fixture failed: '+args.join(' '));}}
for(const name of fs.readdirSync('src/data'))put(name.replace('.json',''),{});
run([astro,'check']);run([astro,'build']);run(['scripts/validate.mjs']);
console.log('PASS: every content file empty; Astro check, production build and validate.');
put('profile',{name:'Fixture name',interests:null,portrait:null,poster:'',video:null});
put('education',{entries:[null,'',{}, {title:'Fixture education',date:null}]});
put('awards',{entries:null});put('contact',{email:null,scholar:''});put('cv',{file:null});
put('publications',{entries:[null,{}, {title:'Fixture publication',authors:null,year:'',order:null,featured:true,image:null,pdf:'',doi:null,type:'',status:null}]});
put('research',{entries:[null,{}, {title:'Fixture research',media:[null,{}, {image:'',video:null}],related:[null,'missing-draft'],order:''}]});
put('skills',{entries:[null,{}, {name:'Fixture skill',category:null,media:null}]});
run([astro,'check']);run([astro,'build']);run(['scripts/validate.mjs']);
const html=fs.readFileSync(path.join(fixture,'dist/publications/index.html'),'utf8');assert(html.includes('Fixture publication'));assert(html.includes('awaiting classification'));assert(html.includes('International Journal Articles'));assert(html.includes('Domestic Journals &amp; Conference Contributions'));const initialHome=fs.readFileSync(path.join(fixture,'dist/index.html'),'utf8');assert(!initialHome.includes('Fixture publication'));assert(!html.includes('href="undefined"'));
assert.equal(hashSource(),before,'Actual CMS content changed');
console.log('PASS: null/blank optional values and partially completed entries; Astro check, build and validate; actual content unchanged.');

put('publications',{entries:[
 {title:'FIRST_ROLE_TEST',authors:authorText,authorRole:'First Author',publicationGroup:'International Journal Articles',featured:false},
 {title:'COFIRST_ROLE_TEST',authorRole:'Co-first Author',publicationGroup:'Domestic Journals & Conference Contributions'},
 {title:'COAUTHOR_ROLE_TEST',authorRole:'Co-author',publicationGroup:'International Journal Articles',featured:true},
 {title:'UNASSIGNED_ROLE_TEST',authorRole:null,publicationGroup:null,featured:true},
]});
put('awards',{entries:[
 {title:'AWARD_WITH_IMAGE',image:'/favicon.svg',imageAlt:'Test award image',date:'2026'},
 {title:'AWARD_WITHOUT_IMAGE'},
 {title:'AWARD_NULL_IMAGE',image:null,imageAlt:null},
]});
run([astro,'build']);run(['scripts/validate.mjs']);
const home=fs.readFileSync(path.join(fixture,'dist/index.html'),'utf8');
assert(home.includes('First- and Co-first-author Publications'));
assert(home.includes('FIRST_ROLE_TEST'));assert(home.includes('COFIRST_ROLE_TEST'));
assert(!home.includes('COAUTHOR_ROLE_TEST'));assert(!home.includes('UNASSIGNED_ROLE_TEST'));
const grouped=fs.readFileSync(path.join(fixture,'dist/publications/index.html'),'utf8');
assert.equal((grouped.match(/<h2>/g)||[]).length,2);
const international=grouped.indexOf('<h2>International Journal Articles');
const domestic=grouped.indexOf('<h2>Domestic Journals');
assert(grouped.indexOf('UNASSIGNED_ROLE_TEST')<international);
assert(grouped.indexOf('FIRST_ROLE_TEST')>international&&grouped.indexOf('FIRST_ROLE_TEST')<domestic);
assert(grouped.indexOf('COFIRST_ROLE_TEST')>domestic);
assert.equal(hashSource(),before);
console.log('PASS: both publication sections, legacy entries preserved, Home includes only first/co-first authors regardless of featured flag.');

assert.equal((home.match(/class="award-image"/g)||[]).length,1);
assert(home.includes('alt="Test award image"'));
assert(home.includes('AWARD_WITHOUT_IMAGE'));assert(home.includes('AWARD_NULL_IMAGE'));
for(const name of ['Juhyung Kim','J. Kim','J. T. Kim','Equal contribution'])assert(grouped.includes('<strong class="author-emphasis">'+name+'</strong>'));
assert(!grouped.includes('<strong class="author-emphasis">J. Kimball'));
console.log('PASS: exact author emphasis and optional award images; no image markup for omitted/null fields.');
console.log('Fixture preview directory: '+fixture);
