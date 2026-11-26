import * as db from '/src/database/db.ts';
import * as json from '/src/services/jsonBackupService.ts';
import { createSeedSnapshot } from '/src/database/seedData.ts';
import { exportToGedcom551, parseAndPreviewGedcom } from '/src/services/gedcomService.ts';
import { parseCsvRows, processCsvImport } from '/src/services/csvImportService.ts';
import { findPotentialDuplicates } from '/src/services/duplicateMergeService.ts';

const button = document.querySelector('#run');
const status = document.querySelector('#status');
const output = document.querySelector('#result');
const stores = ['people','branches','unions','relationships','lifeEvents','media','stories'];
const check = (condition, message) => { if (!condition) throw Error(message); };
const clone = value => structuredClone(value);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,stable(value[key])]));
  return value;
}
function business(value) {
  const data=clone(value); delete data.exportedAt;
  delete data.settings.lastBackupAt;
  for(const store of stores) data[store].sort((a,b)=>a.id.localeCompare(b.id));
  return JSON.stringify(stable(data));
}
async function rejects(action) {
  try { await action(); } catch (error) { return `${error.name}: ${error.message}`; }
  throw Error('Expected rejection');
}
button.addEventListener('click', async () => {
  if(location.hostname!=='127.0.0.1'||location.port!=='3230') { status.textContent='BLOCKED: use the disposable QA origin'; return; }
  button.disabled=true;
  const evidence={testedSHA:'211a85d25a491be1cf8317fd85cba853f1437888',userAgent:navigator.userAgent,origin:location.origin,startedAt:new Date().toISOString(),cases:[]};
  const fixture=await fetch('/docs/qa/m1-desktop/evidence/pr2-product/before-ui-merge.json').then(response=>response.json());
  const reset=async data=>{await db.replaceEntireDatabase(clone(data||fixture));};
  const run=async(id,action)=>{
    status.textContent=`Running ${id}`;
    try { evidence.cases.push({id,adapterStatus:'PASS',details:await action()}); }
    catch(error) { evidence.cases.push({id,adapterStatus:'FAIL',error:String(error)}); }
    output.textContent=JSON.stringify(evidence,null,2);
  };
  await run('M12B-D01',async()=>{
    const data=clone(fixture);data.unions=[];data.relationships=[];await reset(data);
    const union={...fixture.unions[0],partnerIds:['m0_target','m0_partner_a']};
    const writes=await Promise.allSettled([db.saveUnionRecord({...union,id:'race-a'}),db.saveUnionRecord({...union,id:'race-b'})]);
    check(writes.filter(value=>value.status==='fulfilled').length===1,'Concurrent duplicate was accepted');
    const before=await db.loadFullSnapshot();
    await rejects(()=>db.saveUnionRecord({...union,id:'race-c'}));
    check(business(before)===business(await db.loadFullSnapshot()),'Rejected write changed data');
    await reset(data);
    await db.saveUnionRecord({...union,id:'dated-a',marriageDate:{precision:'year',year:1990}});
    await db.saveUnionRecord({...union,id:'dated-b',marriageDate:{precision:'year',year:2000}});
    check((await db.loadFullSnapshot()).unions.length===2,'Distinct dated remarriage missing');
    data.unions=[{...union,id:'target-u'},{...union,id:'source-u',partnerIds:['m0_source','m0_partner_a']}];await reset(data);
    const mergeBefore=await db.loadFullSnapshot();const rejection=await rejects(()=>db.mergePersonRecords('m0_target','m0_source'));
    check(business(mergeBefore)===business(await db.loadFullSnapshot()),'Rejected merge changed data');
    return {concurrent:writes.map(value=>value.status),rejection,twoTabProductUI:'NOT_TESTED: concurrent adapter calls share one page connection'};
  });
  await run('M12B-D02',async()=>{
    await reset();const before=await db.loadFullSnapshot();const rejection=await rejects(()=>db.deleteMediaRecord('m0_image'));
    check(business(before)===business(await db.loadFullSnapshot()),'Referenced media deleted');
    const saved=await db.savePersonRecord({...before.people.find(person=>person.id==='m0_child')},{dataUrl:fixture.media[0].dataUrl,mimeType:'image/svg+xml'});
    const after=await db.loadFullSnapshot();check(after.media.some(media=>media.id===saved.portraitMediaId&&media.personIds.includes(saved.id)),'Portrait linkage missing');
    return {rejection,mediaBefore:before.media.length,mediaAfter:after.media.length,productLargePNG:'Separate product UI check required'};
  });
  await run('M12B-D03',async()=>{
    await reset();await db.mergePersonRecords('m0_target','m0_source');
    const merged=await db.loadFullSnapshot();const parsed=json.parseAndValidateJsonBackup(await json.serializeDatabaseBackup(merged));check(parsed.valid,'Own backup invalid');
    const stats=await db.mergeDatabaseSnapshot(parsed.snapshot);check(business(merged)===business(await db.loadFullSnapshot()),'Own backup is not a no-op');
    await db.restoreDatabaseSnapshot(parsed.snapshot);check(business(merged)===business(await db.loadFullSnapshot()),'Round-trip changed data');
    const parent=merged.branches[0];await db.saveBranchRecord({...parent,id:'m2-child-branch',parentBranchId:parent.id,founderId:undefined});
    await db.deleteBranchRecord(parent.id);const detached=await db.loadFullSnapshot();
    check(!detached.branches.find(branch=>branch.id==='m2-child-branch').parentBranchId,'Child branch orphaned');
    for(const store of ['people','media','stories','lifeEvents'])check(detached[store].length===merged[store].length,`${store} lost`);
    const final=json.parseAndValidateJsonBackup(await json.serializeDatabaseBackup(detached));check(final.valid,'Post-delete backup invalid');await db.restoreDatabaseSnapshot(final.snapshot);
    check(business(detached)===business(await db.loadFullSnapshot()),'Post-delete round-trip changed data');
    return {stats,counts:Object.fromEntries(stores.map(store=>[store,detached[store].length])),root:detached.settings.rootPersonId,comparison:'All records and settings compared except exportedAt and documented backup-generated settings.lastBackupAt'};
  });
  await run('M12B-D04',async()=>{
    const data=clone(fixture);data.people[0].birthDate={precision:'exact',year:1900,month:3};data.people[1].deathDate={precision:'approx',displayText:'Cuối đời Lê'};
    const preview=json.parseAndValidateJsonBackup(JSON.stringify(data));check(preview.valid&&preview.warnings.length>0,'Historical date warning missing');await db.restoreDatabaseSnapshot(preview.snapshot);
    check(business(data)===business(await db.loadFullSnapshot()),'Historical values changed');
    const invalid=clone(data);invalid.people[0].birthDate={precision:'exact',year:1900,month:2,day:30};const blocked=json.parseAndValidateJsonBackup(JSON.stringify(invalid));check(!blocked.valid&&blocked.errors.length>0,'Impossible date accepted');
    return {warnings:preview.warnings,blockedErrors:blocked.errors};
  });
  await run('M12B-D06',async()=>{
    const seed=createSeedSnapshot();check(seed.relationships.length===40,'Unexpected seed relationship baseline');
    const preview=parseAndPreviewGedcom(exportToGedcom551(seed));check(preview.errors.length===0,'GEDCOM parse errors');await db.restoreDatabaseSnapshot(preview.snapshot);const restored=await db.loadFullSnapshot();
    check(restored.relationships.length===40&&restored.unions.length===12,'GEDCOM edges or unions changed');
    check(restored.lifeEvents.length===0&&restored.media.length===0&&restored.stories.length===0,'Unexpected GEDCOM collection support');
    return {original:{relationships:40,unions:12},restored:{relationships:restored.relationships.length,unions:restored.unions.length},warnings:preview.warnings,productWarningUI:'Separate UI inspection required'};
  });
  await run('M12B-D07',async()=>{
    const data=clone(fixture);data.people=[clone(data.people.find(person=>person.id==='m0_target'))];data.unions=[];data.relationships=[];data.lifeEvents=[];data.media=[];data.stories=[];data.settings.rootPersonId='m0_target';data.branches.forEach(branch=>branch.founderId='m0_target');await reset(data);
    const parsed=processCsvImport(parseCsvRows('Họ và tên,Giới tính,Đời thứ,Năm sinh\nM0 Nguyễn Trùng Tên,Nam,4,1980'),data.branches,data.people);check(parsed.errors.length===0,'CSV rejected');await db.mergeDatabaseSnapshot({...data,people:parsed.parsedPeople,branches:[]});
    const stored=await db.loadFullSnapshot();const candidates=findPotentialDuplicates(stored.people,stored.relationships,stored.unions);check(candidates.length===1&&stored.people.length===2,'Cross-generation duplicate missing');
    check(candidates[0].reasons.some(reason=>reason.includes('Khác đời')),'Generation warning missing');return {people:stored.people.length,reasons:candidates[0].reasons};
  });
  evidence.finishedAt=new Date().toISOString();status.textContent='Completed';output.textContent=JSON.stringify(evidence,null,2);button.disabled=false;
});
