const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APK_PATH = path.resolve('C:/Users/ARVIND/.gemini/antigravity-ide/brain/f1d5ee54-d7a7-4cbe-a633-d6990a424012/scratch/apk-dist/app-debug.apk');
const RUN_ID = '34227769319';
const ADB = 'C:\\Users\\ARVIND\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

async function waitAndInstall() {
  console.log(`Polling GitHub Actions Run ${RUN_ID}...`);

  while (true) {
    try {
      const res = await fetch(`https://api.github.com/repos/arvindkekan-tech/onion-quality-auditor/actions/runs/${RUN_ID}`);
      const data = await res.json();
      console.log(`  [${new Date().toLocaleTimeString()}] Status: ${data.status}, Conclusion: ${data.conclusion}`);

      if (data.status === 'completed') {
        if (data.conclusion !== 'success') {
          throw new Error(`Build failed with conclusion: ${data.conclusion}`);
        }
        console.log('GitHub Actions build succeeded!');
        break;
      }
    } catch (err) {
      console.error('Error checking run:', err.message);
    }
    await new Promise(r => setTimeout(r, 6000));
  }

  // Fetch the latest release asset
  console.log('Fetching release asset URL...');
  let downloadUrl = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const relRes = await fetch('https://api.github.com/repos/arvindkekan-tech/onion-quality-auditor/releases');
    const releases = await relRes.json();
    const latestRelease = releases[0];
    const asset = latestRelease?.assets?.find(a => a.name === 'app-debug.apk');
    if (asset && new Date(asset.updated_at).getTime() > Date.now() - 300000) {
      downloadUrl = asset.browser_download_url;
      console.log('Found newly updated release asset:', downloadUrl, 'Updated at:', asset.updated_at);
      break;
    }
    console.log('Waiting for release asset to be uploaded...');
    await new Promise(r => setTimeout(r, 4000));
  }

  if (!downloadUrl) {
    downloadUrl = 'https://github.com/arvindkekan-tech/onion-quality-auditor/releases/download/android-apk-latest/app-debug.apk';
  }

  console.log(`Downloading newly built APK from ${downloadUrl}...`);
  const response = await fetch(downloadUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download APK: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(APK_PATH, Buffer.from(arrayBuffer));
  console.log(`Saved APK to ${APK_PATH} (${fs.statSync(APK_PATH).size} bytes)`);

  // Install on emulator
  console.log('Connecting ADB to 127.0.0.1:5555...');
  execSync(`"${ADB}" connect 127.0.0.1:5555`, { stdio: 'inherit' });

  console.log('Uninstalling previous app...');
  try {
    execSync(`"${ADB}" -s 127.0.0.1:5555 uninstall com.onivis.app`, { stdio: 'inherit' });
  } catch (e) {
    console.log('Uninstall note:', e.message);
  }

  console.log('Installing new APK on emulator...');
  execSync(`"${ADB}" -s 127.0.0.1:5555 install -r "${APK_PATH}"`, { stdio: 'inherit' });

  console.log('Launching com.onivis.app on emulator...');
  execSync(`"${ADB}" -s 127.0.0.1:5555 shell monkey -p com.onivis.app -c android.intent.category.LAUNCHER 1`, { stdio: 'inherit' });

  // Forward Chrome DevTools remote port
  console.log('Waiting 3s for app startup...');
  await new Promise(r => setTimeout(r, 3000));

  const pids = execSync(`"${ADB}" -s 127.0.0.1:5555 shell pidof com.onivis.app`).toString().trim().split(/\s+/);
  const appPid = pids[0];
  console.log(`Forwarding devtools port for PID: ${appPid}...`);
  execSync(`"${ADB}" -s 127.0.0.1:5555 forward tcp:9222 localabstract:webview_devtools_remote_${appPid}`, { stdio: 'inherit' });

  console.log('READY FOR FULL QA EXECUTION!');
  process.exit(0);
}

waitAndInstall().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
