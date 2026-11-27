import hashlib
import json
import pathlib
import platform
import subprocess
import time

repo = pathlib.Path(__file__).resolve().parents[4]
out = pathlib.Path(__file__).resolve().parent / 'cli'
out.mkdir(exist_ok=True)
result = {
    'testedSHA': subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),
    'platform': platform.platform(),
    'node': subprocess.check_output(['node','--version'],text=True).strip(),
    'lockSHA256': hashlib.sha256((repo/'bun.lock').read_bytes()).hexdigest(),
    'commands': [],
    'logNormalization': 'Trailing whitespace and terminal blank lines trimmed.',
}
for name, command in [('lint','npm run lint'),('build','npm run build'),('regression','npm test')]:
    started = time.monotonic()
    process = subprocess.run(['cmd.exe','/d','/c',command],cwd=repo,capture_output=True,text=True,encoding='utf-8',errors='replace')
    log_text = process.stdout+'\nSTDERR\n'+process.stderr
    log_text = '\n'.join(line.rstrip() for line in log_text.splitlines()).rstrip()+'\n'
    (out/(name+'.txt')).write_text(log_text,encoding='utf-8')
    result['commands'].append({'command':command,'exit':process.returncode,'seconds':round(time.monotonic()-started,3),'log':name+'.txt'})
    (out/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(name,process.returncode,flush=True)
result['sourceDiff'] = subprocess.check_output(['git','diff','HEAD','--','src','package.json','bun.lock'],cwd=repo,text=True)
(out/'results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
