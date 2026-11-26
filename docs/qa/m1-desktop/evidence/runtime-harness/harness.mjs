import * as db from '/src/database/db.ts';
import * as backup from '/src/services/jsonBackupService.ts';

const SHAS = {
  M11: '6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e',
  M12A: '43d9b0271c9f2fdb53f419b2fd507a7a6dd80748',
};
const timestamp = '2026-11-25T00:00:00.000Z';
const timestamps = { createdAt: timestamp, updatedAt: timestamp };
const stores = ['branches','people','unions','relationships','lifeEvents','media','stories'];
const profile = new URL(location.href).searchParams.get('profile') || 'Record the dedicated browser profile directory externally';
const ui = {
  status: document.querySelector('#status'), output: document.querySelector('#output'),
  cases: document.querySelector('#cases'), download: document.querySelector('#download'),
};
let evidence;
document.querySelector('#environment').textContent = `${navigator.userAgent} | ${location.origin} | ${profile}`;

function person(id, fields = {}) {
  return { id, fullName: 'M0 Nguyễn Trùng Tên', gender: 'male', isLiving: true,
    birthDate: { precision: 'year', year: 1980 }, generation: 3, branchId: 'm0_branch', ...timestamps, ...fields };
}
function event(id, personId) {
  return { id, personId, title: `M0 MỐC DUY NHẤT ${id}`, type: 'other', date: { precision: 'year', year: 2000 },
    description: `Synthetic event content ${id}`, ...timestamps };
}
function relation(id, parentId, childId, fields = {}) {
  return { id, parentId, childId, lineageType: 'biological', ...timestamps, ...fields };
}
function union(id, partnerIds, fields = {}) {
  return { id, partnerIds, status: 'married', ...timestamps, ...fields };
}
function snapshot(fields = {}) {
  return { app:'Gia Phả Việt – Cội Nguồn', schemaVersion:1, exportedAt:timestamp,
    settings:{ id:'default', clanName:'M0 DEMO Desktop', clanMotto:'Dữ liệu tổng hợp phục vụ kiểm thử',
      ancestralHallLocation:'Địa điểm giả M0', schemaVersion:1, updatedAt:timestamp },
    branches:[], people:[], unions:[], relationships:[], lifeEvents:[], media:[], stories:[], ...fields };
}
// Extends the three-person M0 merge fixture with the handoff's three events,
// two historical unions, step child and compatible duplicate child edge.
function linkedFixture() {
  const picture = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1B3B2B"/></svg>');
  const base = snapshot();
  return { ...base,
    settings:{ ...base.settings, rootPersonId:'m0_source' },
    branches:[{ id:'m0_branch', name:'Chi M0 Demo', code:'M0', subBranches:[], founderId:'m0_source', ...timestamps }],
    people:[
      person('m0_target'), person('m0_source',{ portraitMediaId:'m0_image', portraitUrl:picture }),
      person('m0_grandparent',{ fullName:'M0 Ông Mẫu', generation:1, birthDate:{ precision:'year', year:1920 } }),
      person('m0_parent',{ fullName:'M0 Cha Mẫu', generation:2, birthDate:{ precision:'year', year:1950 } }),
      person('m0_child',{ fullName:'M0 Con Mẫu', generation:4, birthDate:{ precision:'year', year:2000 } }),
      person('m0_stepchild',{ fullName:'M0 Con Riêng Mẫu', generation:4, birthDate:{ precision:'year', year:2002 } }),
      person('m0_partner_a',{ fullName:'M0 Phối Ngẫu A', gender:'female' }),
      person('m0_partner_b',{ fullName:'M0 Phối Ngẫu B', gender:'female' }),
    ],
    unions:[union('m0_union_1',['m0_source','m0_partner_a'],{marriageOrder:1}),
      union('m0_union_2',['m0_source','m0_partner_b'],{marriageOrder:2,status:'widowed'}),
      union('m0_union_single',['m0_source'],{status:'unknown'})],
    relationships:[
      relation('m0_ancestor','m0_grandparent','m0_parent'),
      relation('m0_parent_source','m0_parent','m0_source'),
      relation('a_source_child','m0_source','m0_child',{unionId:'m0_union_1',birthOrder:1,notes:'Nguồn'}),
      relation('z_target_child','m0_target','m0_child',{lineageType:'unknown',notes:'Đích'}),
      relation('m0_other_parent','m0_partner_a','m0_child',{unionId:'m0_union_1'}),
      relation('m0_step','m0_source','m0_stepchild',{lineageType:'step',unionId:'m0_union_2'}),
    ],
    lifeEvents:[event('m0_event_source_1','m0_source'),event('m0_event_source_2','m0_source'),event('m0_event_target','m0_target')],
    media:[{id:'m0_image',title:'Ảnh hình học tổng hợp M0',category:'portrait',mimeType:'image/svg+xml',dataUrl:picture,
      personIds:['m0_source','m0_target','m0_child'],branchId:'m0_branch',...timestamps}],
    stories:[{id:'m0_story',title:'M0 Nhật ký kiểm thử',content:'Ghi chép tổng hợp, không có người thật',
      personIds:['m0_source','m0_target','m0_child'],mediaIds:['m0_image'],branchId:'m0_branch',...timestamps}],
  };
}
function count(data) {
  return {settings:data.settings ? 1 : 0,...Object.fromEntries(stores.map(name=>[name,data[name].length]))};
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
    .filter(key=>value[key]!==undefined).map(key=>[key,stable(value[key])]));
  return value;
}
function business(data) {
  const copy = structuredClone(data);
  delete copy.exportedAt;
  for (const store of stores) copy[store].sort((a,b)=>a.id.localeCompare(b.id));
  return stable(copy);
}
function same(a,b) { return JSON.stringify(business(a)) === JSON.stringify(business(b)); }
function assert(value, message) { if (!value) throw new Error(message); }
async function reject(action, pattern) {
  try { await action(); } catch(error) {
    const text = `${error.name}: ${error.message}`;
    if (pattern) assert(pattern.test(text), `Unexpected rejection: ${text}`);
    return text;
  }
  throw new Error('Operation resolved when rejection was required');
}
async function current() { return await db.loadFullSnapshot(); }
async function reset(data=linkedFixture()) { await db.replaceEntireDatabase(structuredClone(data)); return await current(); }
function note(ctx, label, value) { ctx.assertions.push({label,value}); }
async function capture(ctx, label) { const value=await current(); ctx.snapshots[label]=value; return value; }
async function caseRun(id, title, body, pending = []) {
  const result = { id,title,adapterStatus:'RUNNING',productUiStatus:pending.length?'PENDING':'NOT_APPLICABLE',
    assertions:[], snapshots:{},pending,startedAt:new Date().toISOString() };
  evidence.cases.push(result);
  render();
  try { await body(result); result.adapterStatus='PASS'; }
  catch(error) { result.adapterStatus='FAIL'; result.error={name:error.name,message:error.message,stack:error.stack}; }
  result.finishedAt=new Date().toISOString();
  render();
}
function render() {
  ui.cases.replaceChildren();
  for (const result of evidence.cases) {
    const tr=document.createElement('tr');
    for (const text of [result.id, result.adapterStatus,
      result.title+'\n'+(result.error?.message||'')+'\n'+result.pending.join('; ')]) {
      const td=document.createElement('td'); td.textContent=text; tr.append(td);
    }
    tr.className=result.adapterStatus==='PASS'?'pass':result.adapterStatus==='FAIL'?'fail':'partial';
    ui.cases.append(tr);
  }
  ui.output.textContent=JSON.stringify(evidence,null,2);
}
async function withFault(method, implementation, action) {
  const original=IDBObjectStore.prototype[method];
  IDBObjectStore.prototype[method]=function(...args){ return implementation.call(this, original, args); };
  try { return await action(); } finally { IDBObjectStore.prototype[method]=original; }
}
async function runM11() {
  await caseRun('M11-D01','Three original event IDs and contents survive merge',async ctx=>{
    const before=await reset();ctx.snapshots.before=before;
    await db.mergePersonRecords('m0_target','m0_source');const after=await capture(ctx,'after');
    assert(!after.people.some(p=>p.id==='m0_source'),'Source was not deleted');
    assert(after.lifeEvents.length===3,'Expected exactly three original events');
    for(const original of before.lifeEvents){const actual=after.lifeEvents.find(e=>e.id===original.id);
      assert(actual && actual.personId==='m0_target','Event ID or new owner missing');
      const { personId: originalOwner, updatedAt: originalUpdate, ...originalContent } = original;
      const { personId: actualOwner, updatedAt: actualUpdate, ...actualContent } = actual;
      assert(JSON.stringify(stable(actualContent))===JSON.stringify(stable(originalContent)),'Event content or creation timestamp changed');}
    note(ctx,'all original event IDs',[...after.lifeEvents.map(e=>e.id)].sort());
  },['Product merge-modal success message and product timeline rendering must be checked separately.']);
  await caseRun('M11-D02','Portrait, media, story, root and founder transfer exactly once',async ctx=>{
    await reset();await capture(ctx,'before');await db.mergePersonRecords('m0_target','m0_source');const after=await capture(ctx,'after');
    assert(after.settings.rootPersonId==='m0_target','Root did not transfer');
    assert(after.branches[0].founderId==='m0_target','Founder did not transfer');
    for(const entry of [...after.media,...after.stories]){
      assert(entry.personIds.includes('m0_target') && !entry.personIds.includes('m0_source'),'Media/story reference did not transfer');
      assert(new Set(entry.personIds).size===entry.personIds.length,'Duplicate person reference remained');}
    assert(after.people.find(p=>p.id==='m0_target').portraitMediaId==='m0_image','Portrait reference missing');
    note(ctx,'counts',count(after));
  },['Product portrait/gallery/story rendering must be checked separately.']);
  await caseRun('M11-D03','Three generations, two unions, compatible edge and step child remain consistent',async ctx=>{
    await reset();await capture(ctx,'before');await db.mergePersonRecords('m0_target','m0_source');const after=await capture(ctx,'after');
    assert(after.unions.length===3,'Union history changed');
    assert(after.unions.filter(u=>u.partnerIds.includes('m0_target')).length===3,'Not all unions transferred');
    const duplicate=after.relationships.filter(r=>r.parentId==='m0_target' && r.childId==='m0_child');
    assert(duplicate.length===1 && duplicate[0].id==='z_target_child','Compatible edge ID not retained');
    assert(duplicate[0].lineageType==='biological' && duplicate[0].unionId==='m0_union_1' && duplicate[0].birthOrder===1,'Compatible edge metadata lost');
    assert(after.relationships.some(r=>r.parentId==='m0_target' && r.childId==='m0_stepchild' && r.lineageType==='step' && r.unionId==='m0_union_2'),'Step-child metadata lost');
    assert(after.relationships.some(r=>r.parentId==='m0_grandparent' && r.childId==='m0_parent'),'Grandparent edge lost');
    note(ctx,'retained edge',duplicate[0]);
  },['Product tree and profile views from spouse and child ends must be checked separately.']);
  await caseRun('M11-D04','Direct/indirect ancestry and source-target union merges reject without writes',async ctx=>{
    for(const scenario of ['direct','indirect','union']){
      const fixture=snapshot({people:[person('m0_target',{branchId:undefined}),person('m0_source',{branchId:undefined}),person('middle',{branchId:undefined})],
        lifeEvents:[event('e','m0_source')],
        relationships:scenario==='direct'?[relation('a','m0_target','m0_source')]:scenario==='indirect'?[relation('a','m0_target','middle'),relation('b','middle','m0_source')]:[],
        unions:scenario==='union'?[union('u',['m0_target','m0_source'])]:[]});
      const before=await reset(fixture);ctx.snapshots[scenario+'Before']=before;
      const error=await reject(()=>db.mergePersonRecords('m0_target','m0_source'),/vòng lặp|chính mình|hôn phối/);
      const after=await current();ctx.snapshots[scenario+'After']=after;
      assert(same(before,after),scenario+' changed data despite rejection');note(ctx,scenario,error);
    }
  },['Product modal error copy must be checked separately.']);
  await caseRun('M11-D05','Fresh transaction state, competing calls, real abort rollback and retry',async ctx=>{
    await reset();const displayed=await capture(ctx,'staleDisplayed');const live=await db.getDatabase();
    const target=displayed.people.find(p=>p.id==='m0_target');const tx=live.transaction(['people','lifeEvents'],'readwrite');
    const edits=Promise.all([tx.objectStore('people').put({...target,occupation:'M1 edit from competing connection'}),
      tx.objectStore('lifeEvents').put(event('m0_event_queued','m0_source')),tx.done]);
    await Promise.all([edits,db.mergePersonRecords('m0_target','m0_source')]);const fresh=await capture(ctx,'freshAfter');
    assert(fresh.people.find(p=>p.id==='m0_target').occupation==='M1 edit from competing connection','Stale target overwrote current edit');
    assert(fresh.lifeEvents.some(e=>e.id==='m0_event_queued'&&e.personId==='m0_target'),'Queued event not retained');
    await reset();const outcomes=await Promise.allSettled([db.mergePersonRecords('m0_target','m0_source'),db.mergePersonRecords('m0_target','m0_source')]);
    assert(outcomes.filter(o=>o.status==='fulfilled').length===1 && outcomes.filter(o=>o.status==='rejected').length===1,'Two competing merges did not serialize');note(ctx,'concurrent results',outcomes.map(o=>o.status));
    for(const scenario of ['async-event-put','sync-source-delete','abort-after-delete']){
      const before=await reset();ctx.snapshots[scenario+'Before']=before;
      let rejection;
      if(scenario==='async-event-put')rejection=await withFault('put',function(original,args){return this.name==='lifeEvents'?this.add(...args):original.apply(this,args);},()=>reject(()=>db.mergePersonRecords('m0_target','m0_source'),/ConstraintError/));
      else rejection=await withFault('delete',function(original,args){
        if(this.name==='people'&&args[0]==='m0_source'){
          if(scenario==='sync-source-delete')throw new Error('M1 injected source delete failure');
          const request=original.apply(this,args);request.addEventListener('success',()=>this.transaction.abort());return request;}
        return original.apply(this,args);
      },()=>reject(()=>db.mergePersonRecords('m0_target','m0_source'),/M1 injected|AbortError/));
      const after=await current();ctx.snapshots[scenario+'After']=after;assert(same(before,after),scenario+' failed complete rollback');
      await db.mergePersonRecords('m0_target','m0_source');assert(!(await current()).people.some(p=>p.id==='m0_source'),'Retry did not complete');note(ctx,scenario,rejection);
    }
  },['Actual two-tab modal interaction and UI double-click lock remain separate product UI checks.']);
  await caseRun('M11-D06','Normal delete keeps baseline cascade independently of merge',async ctx=>{
    await reset();await capture(ctx,'before');await db.deletePersonSafely('m0_source');const after=await capture(ctx,'after');
    assert(after.lifeEvents.length===1&&after.lifeEvents[0].personId==='m0_target','Delete cascade event behavior changed');
    assert(!after.people.some(p=>p.id==='m0_source') && after.people.some(p=>p.id==='m0_target'),'Delete removed wrong people');
    assert(after.settings.rootPersonId===undefined && after.branches[0].founderId===undefined,'Delete root/founder cascade changed');
    assert(after.stories[0].personIds.includes('m0_target')&&!after.stories[0].personIds.includes('m0_source'),'Delete story cleanup failed');
    assert(after.media[0].personIds.includes('m0_target')&&!after.media[0].personIds.includes('m0_source'),'Delete media cleanup failed');
  },['Product normal-delete confirmation UI must be checked separately.']);
  await caseRun('M11-D07','PDF and test hygiene are intentionally outside adapter harness',async ctx=>{
    ctx.adapterStatus='NOT_APPLICABLE';note(ctx,'scope','No PDF download or Git cleanliness assertion is made by this harness.');
  },['Parent must run Windows suites and inspect Git/PDF files; product personal/book export must be checked separately.']);
  evidence.cases.at(-1).adapterStatus='NOT_APPLICABLE';
}

async function runM12() {
  if(typeof db.restoreDatabaseSnapshot!=='function')throw new Error('M12A adapter absent: use exact PR #3 worktree, not PR #2.');
  const csv=await import('/src/services/csvImportService.ts');
  const ged=await import('/src/services/gedcomService.ts');
  await caseRun('M12A-D01','Full v1 round-trip with eight stores, plus deliberate empty restore',async ctx=>{
    const initial=await reset();ctx.snapshots.before=initial;
    const exported=await backup.serializeDatabaseBackup(initial);const preview=backup.parseAndValidateJsonBackup(exported);
    assert(preview.valid,preview.errors?.join(' · '));assert(preview.snapshot.schemaVersion===1,'Schema version changed');
    await db.restoreDatabaseSnapshot(preview.snapshot);const after=await capture(ctx,'after');
    assert(same(preview.snapshot,after),'Serialized backup did not restore exact semantic snapshot');
    assert(after.media.length===1&&after.stories.length===1&&after.lifeEvents.length===3,'Linked collections missing');
    for(const store of stores)assert(JSON.stringify(initial[store].map(x=>x.id).sort())===JSON.stringify(after[store].map(x=>x.id).sort()),store+' IDs changed');
    const empty=snapshot();await db.restoreDatabaseSnapshot(empty);const emptied=await capture(ctx,'emptyAfter');
    assert(stores.every(name=>emptied[name].length===0),'Deliberate empty restore retained records');note(ctx,'restored counts',count(after));
  },['Product preview/cancel/confirm UX for populated and empty backups remains a separate UI check.']);
  await caseRun('M12A-D02','Duplicate IDs, nested type, missing media reject; chronology only warns',async ctx=>{
    const before=await reset();ctx.snapshots.before=before;
    const variants={duplicate: snapshot({people:[person('p',{branchId:undefined}),person('p',{branchId:undefined})]}),
      nested:snapshot({lifeEvents:[null]}),missingMedia:snapshot({people:[person('p',{branchId:undefined,portraitMediaId:'absent'})]})};
    for(const [name,value]of Object.entries(variants)){
      const preview=backup.validateAndPreviewJsonBackup(JSON.stringify(value),before,'replace');
      assert(!preview.valid&&preview.errors.length>0,name+' preview accepted invalid input');
      await reject(()=>db.restoreDatabaseSnapshot(value));assert(same(before,await current()),name+' changed DB');note(ctx,name,preview.errors);
    }
    const unusual=snapshot({people:[person('chronology',{branchId:undefined,isLiving:false,birthDate:{precision:'year',year:2000},deathDate:{precision:'year',year:1990}})]});
    const warning=backup.parseAndValidateJsonBackup(JSON.stringify(unusual));
    assert(warning.valid&&warning.warnings.length>0,'Chronology must warn, not silently normalize');
    await db.restoreDatabaseSnapshot(warning.snapshot);const after=await capture(ctx,'chronologyAfter');
    assert(after.people[0].birthDate.year===2000&&after.people[0].deathDate.year===1990,'Chronology values changed');note(ctx,'chronology warnings',warning.warnings);
  },['Positioned error/warning rendering in product import preview must be checked separately.']);
  await caseRun('M12A-D03','Combined graph cycle and stale-preview ID conflict reject without writes',async ctx=>{
    const people=['a','b','c'].map(id=>person(id,{branchId:undefined}));const chain=snapshot({people,relationships:[relation('ab','a','b'),relation('bc','b','c')]});
    const before=await reset(chain);ctx.snapshots.cycleBefore=before;
    const incoming=snapshot({people:[...people,person('otherwise-valid',{branchId:undefined})],relationships:[relation('ca','c','a')]});
    const cycle=backup.validateAndPreviewJsonBackup(JSON.stringify(incoming),before,'merge');assert(!cycle.valid,'Combined cycle preview accepted');
    await reject(()=>db.mergeDatabaseSnapshot(incoming),/vòng lặp/);assert(same(before,await current()),'Cycle rejection wrote data');note(ctx,'cycle errors',cycle.errors);
    await reset(snapshot({people:[person('existing',{branchId:undefined})]}));
    const candidate=snapshot({people:[person('collision',{branchId:undefined}),person('valid-new',{branchId:undefined})]});
    const preview=backup.validateAndPreviewJsonBackup(JSON.stringify(candidate),await current(),'merge');assert(preview.valid,'Candidate should initially be valid');
    const live=await db.getDatabase();await live.add('people',person('collision',{branchId:undefined,fullName:'M1 competing edit'}));
    const conflictBefore=await capture(ctx,'conflictBefore');
    await reject(()=>db.mergeDatabaseSnapshot(preview.snapshot),/trùng ID/);const conflictAfter=await capture(ctx,'conflictAfter');
    assert(same(conflictBefore,conflictAfter),'Stale preview overwrote current record or partially added candidate');
    note(ctx,'stale candidate rechecked',true);
  },['Actual tab A preview/tab B UI write/confirm interaction remains a separate UI check.']);
  await caseRun('M12A-D04','Identical ID plus new record appends once, settings remain local',async ctx=>{
    const original=await reset();ctx.snapshots.before=original;
    const existing=original.people.find(p=>p.id==='m0_child');
    const incoming=snapshot({settings:{...snapshot().settings,clanName:'Incoming setting must not replace local'},people:[structuredClone(existing),person('new',{branchId:undefined})],relationships:[relation('new-edge','m0_parent','new')]});
    const preview=backup.validateAndPreviewJsonBackup(JSON.stringify(incoming),original,'merge');assert(preview.valid,preview.errors.join(' · '));
    const first=await db.mergeDatabaseSnapshot(preview.snapshot);const second=await db.mergeDatabaseSnapshot(preview.snapshot);const after=await capture(ctx,'after');
    assert(first.addedPeople===1&&first.addedRelationships===1,'First merge additions incorrect');
    assert(second.addedPeople===0&&second.addedRelationships===0,'Second import duplicated IDs');
    assert(JSON.stringify(after.settings)===JSON.stringify(original.settings),'Merge overwrote settings');
    note(ctx,'first/second stats',{first,second});
  },['Product idempotent-import feedback remains a separate UI check.']);
  await caseRun('M12A-D05','CSV UTF-8 new branch and unique existing parent; ambiguous/year errors block parser',async ctx=>{
    await reset(snapshot({people:[person('parent',{fullName:'M0 Cha Mẫu',branchId:undefined})]}));const before=await capture(ctx,'before');
    const parsed=csv.processCsvImport(csv.parseCsvRows('Họ và tên,Giới tính,Chi họ,Họ tên Cha\nM0 Con Nhập,Nữ,Chi Mới,M0 Cha Mẫu'),before.branches,before.people);
    assert(parsed.errors.length===0,parsed.errors.join(' · '));
    await db.mergeDatabaseSnapshot(snapshot({people:parsed.parsedPeople,branches:parsed.parsedBranches,unions:parsed.parsedUnions,relationships:parsed.parsedRelationships}));
    const after=await capture(ctx,'after');assert(after.branches.some(b=>b.name==='Chi Mới'),'CSV branch missing');
    assert(after.relationships.some(r=>r.parentId==='parent'&&r.childId===parsed.parsedPeople[0].id),'CSV existing-parent edge missing');
    const invalid=csv.processCsvImport(csv.parseCsvRows('Họ và tên,Năm sinh,Họ tên Cha\nM0 Con Lỗi,1980abc,M0 Cha Mẫu\nM0 Cha Mẫu,1950,'),after.branches,after.people);
    assert(invalid.errors.some(e=>/Năm sinh/.test(e))&&invalid.errors.some(e=>/không xác định duy nhất/.test(e)),'CSV diagnostics missing');
    assert(same(after,await current()),'Parser changed DB');note(ctx,'invalid CSV errors',invalid.errors);
  },['Product preview must reject entire invalid CSV; this harness deliberately does not call write boundary when parser reports errors.']);
  await caseRun('M12A-D06','GEDCOM UTF-8 self-contained branches/family with unsupported-tag warnings',async ctx=>{
    await reset();await capture(ctx,'before');
    const text=['0 HEAD','1 GEDC','2 VERS 5.5.1','1 CHAR UTF-8','0 @I1@ INDI','1 NAME Cha /Mẫu/','1 SEX M','1 _BRAN Chi Thử','1 _UNSUPPORTED M0','0 @I2@ INDI','1 NAME Mẹ /Mẫu/','1 SEX F','0 @I3@ INDI','1 NAME Con /Mẫu/','0 @F1@ FAM','1 HUSB @I1@','1 WIFE @I2@','1 CHIL @I3@','0 TRLR'].join('\n');
    const parsed=ged.parseAndPreviewGedcom(text);assert(parsed.valid,parsed.errors.join(' · '));assert(parsed.warnings.length>0,'Unsupported tag warning missing');
    await db.restoreDatabaseSnapshot(parsed.snapshot);const after=await capture(ctx,'after');
    assert(after.people.length===3&&after.unions.length===1&&after.relationships.length===2,'GEDCOM family counts wrong');
    assert(after.people.some(p=>p.fullName.includes('Mẫu')),'Vietnamese text missing');
    const ids=new Set(after.people.map(p=>p.id));assert(after.relationships.every(r=>ids.has(r.parentId)&&ids.has(r.childId)),'GEDCOM xref not self-contained');
    for(const broken of [text.replace('1 CHIL @I3@','1 CHIL @MISSING@'),text.replace('\n0 TRLR','')]){
      const result=ged.parseAndPreviewGedcom(broken);assert(!result.valid&&result.errors.length>0,'Broken GEDCOM accepted');note(ctx,'broken GEDCOM errors',result.errors);}
    assert(same(after,await current()),'Broken preview changed DB');note(ctx,'supported warnings',parsed.warnings);
  },['Product diagnostic modal and confirmation gate remain separate UI checks.']);
  await caseRun('M12A-D07','Large candidate serializes repeated calls; native request rollback then retry',async ctx=>{
    await reset(snapshot());const people=Array.from({length:2500},(_,i)=>person('large-'+String(i).padStart(4,'0'),{branchId:undefined,fullName:'M1 synthetic '+i}));
    const relationships=people.slice(1).map((p,i)=>relation('large-edge-'+i,people[Math.floor(i/2)].id,p.id));const incoming=snapshot({people,relationships});
    const started=performance.now();const outcomes=await Promise.all([db.mergeDatabaseSnapshot(incoming),db.mergeDatabaseSnapshot(incoming)]);const after=await capture(ctx,'largeAfter');
    assert(after.people.length===2500&&after.relationships.length===2499,'Repeated large import duplicated or lost records');
    assert(outcomes.reduce((n,s)=>n+s.addedPeople,0)===2500,'Two calls did not serialize idempotently');note(ctx,'two adapter calls',{outcomes,elapsedMs:performance.now()-started});
    const original=await reset(linkedFixture());const next=structuredClone(original);next.settings.clanName='M1 restore retry';
    await withFault('put',function(method,args){if(this.name==='relationships')throw new Error('M1 sync restore fault');return method.apply(this,args);},()=>reject(()=>db.restoreDatabaseSnapshot(next),/M1 sync restore fault/));
    assert(same(original,await current()),'Restore after-clear failure did not roll back all stores');await db.restoreDatabaseSnapshot(next);assert((await current()).settings.clanName===next.settings.clanName,'Restore retry failed');
    const mergeBefore=await capture(ctx,'mergeFaultBefore');const candidate=snapshot({people:[person('retry-new',{branchId:undefined})],relationships:[relation('retry-link','m0_parent','retry-new')]});
    const old=mergeBefore.relationships[0];
    await withFault('add',function(method,args){return method.call(this,this.name==='relationships'?old:args[0],...args.slice(1));},()=>reject(()=>db.mergeDatabaseSnapshot(candidate),/ConstraintError/));
    assert(same(mergeBefore,await current()),'Async merge request failure partially wrote candidate');
    const retry=await db.mergeDatabaseSnapshot(candidate);assert(retry.addedPeople===1&&retry.addedRelationships===1,'Async merge retry failed');note(ctx,'native fault retry',retry);
  },['UI transaction busy state, close prevention and rapid confirmation clicks must be checked in product modal.']);
}

async function run(suite) {
  for(const button of document.querySelectorAll('button'))button.disabled=true;
  evidence={suite,expectedTestedSha:SHAS[suite],shaVerification:'Verify server worktree SHA externally; the harness does not infer Git revision.',
    startedAt:new Date().toISOString(),origin:location.origin,userAgent:navigator.userAgent,profile,
    engine:'native browser IndexedDB (not fake-indexeddb)',fixtureOrigin:'Extended M0 synthetic merge fixture; no family data',
    scope:'Application adapters/parsers; pending product UI explicitly listed per case',cases:[]};
  ui.status.textContent=`Running ${suite}...`;
  try { if(suite==='M11')await runM11();else await runM12(); }
  catch(error){evidence.fatal={name:error.name,message:error.message,stack:error.stack};}
  evidence.finishedAt=new Date().toISOString();
  evidence.summary={pass:evidence.cases.filter(c=>c.adapterStatus==='PASS').length,fail:evidence.cases.filter(c=>c.adapterStatus==='FAIL').length,
    notApplicable:evidence.cases.filter(c=>c.adapterStatus==='NOT_APPLICABLE').length,productUiPending:evidence.cases.filter(c=>c.pending.length>0).length};
  ui.status.textContent=`${suite}: ${evidence.summary.pass} adapter PASS, ${evidence.summary.fail} FAIL, ${evidence.summary.notApplicable} not applicable. Product UI requirements remain separately pending.`;
  render();for(const button of document.querySelectorAll('button'))button.disabled=false;
}
document.querySelector('#run-m11').addEventListener('click',()=>run('M11'));
document.querySelector('#run-m12').addEventListener('click',()=>run('M12A'));
document.querySelector('#prepare-merge').addEventListener('click',async()=>{
  await reset();ui.status.textContent='M11 linked fixture prepared. Open the product at this same origin to inspect the merge modal, events, story, portrait and tree.';
});
ui.download.addEventListener('click',()=>{
  if(!evidence)return;const blob=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${evidence.suite}-native-indexeddb-${evidence.expectedTestedSha.slice(0,7)}.json`;a.click();URL.revokeObjectURL(url);
});
