import json,hashlib,urllib.request,urllib.error,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[4]
base='https://coi-nguon-gift.pages.dev'
opener=urllib.request.build_opener()
opener.addheaders=[('User-Agent','CoiNguon-UAT-Verifier/1.0')]
urllib.request.install_opener(opener)
results=[]
for path in ['/','/build-info.json','/manifest.webmanifest','/pwa-192x192.png','/pwa-512x512.png','/pwa-maskable-512x512.png','/apple-touch-icon.png','/sw.js']:
    with urllib.request.urlopen(base+path,timeout=30) as response:
        body=response.read();local=root/'dist'/('index.html' if path=='/' else path.lstrip('/'))
        results.append({'path':path,'status':response.status,'type':response.headers.get('Content-Type'),'cacheControl':response.headers.get('Cache-Control'),'csp':response.headers.get('Content-Security-Policy'),'swAllowed':response.headers.get('Service-Worker-Allowed'),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'matchesBuiltArtifact':local.read_bytes()==body})
for method in ['GET','POST','OPTIONS']:
    request=urllib.request.Request(base+'/api/biography/generate',data=b'{malformed' if method=='POST' else None,method=method,headers={'Content-Type':'application/json'})
    try:response=urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as error:response=error
    results.append({'path':'/api/biography/generate','method':method,'status':response.status,'cacheControl':response.headers.get('Cache-Control'),'body':json.loads(response.read())})
for file in sorted((root/'dist/assets').glob('*.woff2')):
    with urllib.request.urlopen(base+'/assets/'+file.name,timeout=30) as response:
        content=response.read();results.append({'path':'/assets/'+file.name,'status':response.status,'type':response.headers.get('Content-Type'),'bytes':len(content),'woff2':content[:4]==b'wOF2','matchesBuiltArtifact':content==file.read_bytes()})
result={'url':base,'deployedSHA':json.loads((root/'dist/build-info.json').read_text())['commit'],'checks':results}
(root/'docs/deploy/cloudflare-pages/evidence/https-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
