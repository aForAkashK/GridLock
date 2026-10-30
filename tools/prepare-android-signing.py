"""Create an ignored local upload key once; never print passwords."""
from pathlib import Path
import os,secrets,subprocess
root=Path(__file__).resolve().parents[1]
store=root/'android/keystores/upload.p12'; properties=root/'android/signing.properties'
if store.exists() or properties.exists():
    raise SystemExit('Signing material already exists; preserved without modification.')
password=secrets.token_urlsafe(32)
environment=dict(os.environ,GRIDLOCK_KEY_PASSWORD=password)
subprocess.run(['keytool','-genkeypair','-storetype','PKCS12','-keystore',str(store),'-alias','gridlock-upload','-keyalg','RSA','-keysize','4096','-validity','10000','-dname','CN=GridLock Upload','-storepass:env','GRIDLOCK_KEY_PASSWORD','-keypass:env','GRIDLOCK_KEY_PASSWORD'],env=environment,check=True,capture_output=True)
properties.write_text(f'storeFile=../keystores/upload.p12\nstorePassword={password}\nkeyAlias=gridlock-upload\nkeyPassword={password}\n')
os.chmod(store,0o600);os.chmod(properties,0o600)
print('Created local upload key and signing.properties (both ignored, mode 0600). Back up both files privately before publishing.')
