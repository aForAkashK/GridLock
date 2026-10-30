import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync('ads.config.json','utf8'));
const app = JSON.parse(fs.readFileSync('app.json','utf8'))['react-native-google-mobile-ads'];
const production = process.argv.includes('--production');
const flag = process.argv.indexOf('--platform');
const platforms = flag >= 0 ? [process.argv[flag+1]] : ['android','ios'];
const errors=[];
if (!['test','production'].includes(config.mode)) errors.push('mode must be test or production');
if (production && config.mode !== 'production') errors.push('Production release is blocked: official test ads are still enabled.');
for (const platform of platforms) {
  if (!['android','ios'].includes(platform)) { errors.push(`Unknown platform: ${platform}`); continue; }
  const appId = app?.[`${platform}_app_id`];
  if (!/^ca-app-pub-\d+~\d+$/.test(appId ?? '')) errors.push(`${platform}: missing AdMob app ID`);
  if ((production || config.mode === 'production') && appId?.includes('3940256099942544')) errors.push(`${platform}: replace the Google sample app ID`);
  for (const kind of ['rewarded','interstitial']) {
    const id = config[platform]?.[kind];
    if (typeof id !== 'string') errors.push(`${platform}: missing ${kind} configuration`);
    if ((production || config.mode === 'production') && (!/^ca-app-pub-\d+\/\d+$/.test(id ?? '') || id.includes('3940256099942544'))) errors.push(`${platform}: provide a production ${kind} ad-unit ID`);
  }
}
if (app?.delay_app_measurement_init !== true) errors.push('Keep measurement delayed until the consent flow.');
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Ad configuration valid (${config.mode}; ${platforms.join(', ')}). ${config.mode === 'test' ? 'Test ads do not generate revenue.' : 'Complete AdMob consent/policy/store-console acceptance before publishing.'}`);
