import os, subprocess, json, pathlib, urllib.request, sys, time
root = pathlib.Path(__file__).resolve().parents[5]
out = pathlib.Path(__file__).resolve().parent
results = []
for port, name in [(3211, 'm1-pr2-qa'),(3212, 'm1-desktop-ui'),(3213, 'm1-pr3-qa')]:
    wd = root / name
    try:
        with urllib.request.urlopen(f'http://localhost:{port}/', timeout=2) as response:
            results.append({'port':port,'alreadyRunning':True,'status':response.status})
            continue
    except Exception:
        pass
    env = os.environ.copy(); env['PORT'] = str(port)
    log = open(out / f'server-{port}.txt','a',encoding='utf-8')
    child = subprocess.Popen(['node',str(wd / 'node_modules/tsx/dist/cli.mjs'),'server.ts'],cwd=wd,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,creationflags=0x08000000|0x00000200|0x00000008)
    results.append({'port':port,'pid':child.pid,'cwd':str(wd)})
(out/'qa-servers.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results))
if '--keep-alive' in sys.argv:
    sys.stdout.flush()
    while True:
        time.sleep(10)
