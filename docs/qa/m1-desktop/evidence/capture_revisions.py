import subprocess, pathlib, json, platform, datetime
repo = pathlib.Path(__file__).resolve().parents[4]
result = {'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'sourceUiHead':'0e51835552741a81ed69d31080d900bf7cc726f0','worktrees':{}}
for label,name in [('pr2','m1-pr2-qa'),('pr3','m1-pr3-qa'),('ui','m1-desktop-ui')]:
    wd = repo.parent/name
    head = subprocess.run(['git','rev-parse','HEAD'],cwd=wd,capture_output=True,text=True,check=True).stdout.strip()
    diff = subprocess.run(['git','diff','HEAD','--','src','server.ts','package.json','bun.lock','public','vite.config.ts'],cwd=wd,capture_output=True,text=True)
    result['worktrees'][label]={'cwd':str(wd),'head':head,'trackedRuntimeDiffExitCode':diff.returncode,'trackedRuntimeDiff':diff.stdout}
pathlib.Path(__file__).with_name('runtime-revisions.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v['head'] for k,v in result['worktrees'].items()}))
