import subprocess, json, time, datetime, pathlib
repo=pathlib.Path(__file__).resolve().parents[5]
out=pathlib.Path(__file__).resolve().parent
def git(*args):
 r=subprocess.run(['git',*args],cwd=repo,capture_output=True,text=True,encoding='utf-8',errors='replace')
 return {'exitCode':r.returncode,'output':r.stdout,'stderr':r.stderr}
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repo':str(repo),'head':git('rev-parse','HEAD'),'trackedBefore':git('diff','HEAD','--'),'statusBefore':git('status','--short'),'changedVsBase':git('diff','--name-only','43d9b0271c9f2fdb53f419b2fd507a7a6dd80748','HEAD'),'commands':[]}
for name,command in [('lint','npm run lint'),('build','npm run build'),('regression','npm test')]:
 start=time.monotonic()
 r=subprocess.run(['cmd.exe','/d','/c',command],cwd=repo,capture_output=True,text=True,encoding='utf-8',errors='replace')
 (out/(name+'.txt')).write_text(r.stdout+'\nSTDERR\n'+r.stderr,encoding='utf-8')
 report['commands'].append({'command':command,'exitCode':r.returncode,'elapsedSeconds':round(time.monotonic()-start,3),'log':name+'.txt'})
 (out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(name,r.returncode,flush=True)
report['headAfter']=git('rev-parse','HEAD')
report['trackedAfter']=git('diff','HEAD','--')
report['statusAfter']=git('status','--short')
report['lockAndSchemaDiff']=git('diff','43d9b0271c9f2fdb53f419b2fd507a7a6dd80748','HEAD','--','bun.lock','package.json','src/database','src/models')
report['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
