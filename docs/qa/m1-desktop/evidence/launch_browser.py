import ctypes, json, os, platform, subprocess, sys
from pathlib import Path
kind = sys.argv[1]
url = sys.argv[2] if len(sys.argv) > 2 else 'about:blank'
exe = Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe') if kind == 'chrome' else Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
profile = Path(r'D:\LMQ_My mine\Gia-pha\.worktrees\browser-profiles') / (kind + '-m1-qa')
profile.mkdir(parents=True, exist_ok=True)
size = ctypes.windll.version.GetFileVersionInfoSizeW(str(exe), None)
data = ctypes.create_string_buffer(size)
ctypes.windll.version.GetFileVersionInfoW(str(exe), 0, size, data)
pointer = ctypes.c_void_p(); length = ctypes.c_uint()
ctypes.windll.version.VerQueryValueW(data, '\\', ctypes.byref(pointer), ctypes.byref(length))
words = ctypes.cast(pointer, ctypes.POINTER(ctypes.c_uint32))
ms, ls = words[2], words[3]
version = f'{ms >> 16}.{ms & 65535}.{ls >> 16}.{ls & 65535}'
proc = subprocess.Popen([str(exe), '--user-data-dir=' + str(profile), '--no-first-run', '--no-default-browser-check', '--new-window', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
metadata = {'browser': kind, 'version': version, 'executable': str(exe), 'profile': str(profile), 'url': url, 'pid': proc.pid, 'windows': platform.platform()}
Path(__file__).with_name(kind + '-profile.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print(json.dumps(metadata))
