import subprocess, pathlib, json, sys, time, platform, hashlib
repo=pathlib.Path(__file__).resolve().parents[4]
label=sys.argv[1]
out=pathlib.Path(__file__).resolve().parent/label
out.mkdir(exist_ok=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
result={'head':head,'platform':platform.platform(),'label':label,'lockSHA256':hashlib.sha256((repo/'bun.lock').read_bytes()).hexdigest(),'commands':[]}
for name,cmd in [('lint','npm run lint'),('build','npm run build'),('regression','npm test'),('pwa-assets','node scripts/check-pwa-assets.mjs http://localhost:3231')]:
    t=time.monotonic()
    r=subprocess.run(['cmd.exe','/d','/c',cmd],cwd=repo,capture_output=True,text=True,encoding='utf-8',errors='replace')
    (out/(name+'.txt')).write_text(r.stdout+'\nSTDERR\n'+r.stderr,encoding='utf-8')
    result['commands'].append({'command':cmd,'exitCode':r.returncode,'elapsedSeconds':round(time.monotonic()-t,3),'log':name+'.txt'})
    (out/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(name,r.returncode,flush=True)
result['sourceDiff']=subprocess.check_output(['git','diff','HEAD','--','src','package.json','bun.lock'],cwd=repo,text=True)
(out/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
