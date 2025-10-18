const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const puppeteer = require('puppeteer');

(async () => {
  const uploadFilePath = path.resolve(__dirname, '..', '_test_upload.txt');

  // start the server as a child process to ensure it's available for the headless browser
  const { spawn } = require('child_process');
  console.log('Starting server as child process...');
  const serverProc = spawn(process.execPath, [path.resolve(__dirname, '..', 'server.js')], { stdio: ['ignore','pipe','pipe'] });
  serverProc.stdout.on('data', d=>{ process.stdout.write('[server] '+d.toString()); });
  serverProc.stderr.on('data', d=>{ process.stderr.write('[server-err] '+d.toString()); });
  // wait for server ready message
  await new Promise((resolve, reject)=>{
    const to = setTimeout(()=>reject(new Error('Server did not start in time')), 8000);
    serverProc.stdout.on('data', (d)=>{
      const s = d.toString();
      if(/Server running on/.test(s) || /Accessible on your LAN/.test(s)){
        clearTimeout(to); resolve();
      }
    });
  });

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // Open the upload page and perform file input. Try multiple host candidates if localhost is unreachable.
  const hosts = ['localhost', '127.0.0.1'];
  // try to detect a LAN IPv4 address
  const os = require('os');
  const nets = os.networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const net of nets[name]){
      if(net.family === 'IPv4' && !net.internal) hosts.push(net.address);
    }
  }

  async function tryGotoCandidates(page, path){
    const maxWait = 10000; // ms
    const start = Date.now();
    let lastErr = null;
    while(Date.now() - start < maxWait){
      for(const h of hosts){
        const url = `http://${h}:3000/${path.replace(/^\/+/, '')}`;
        try{
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 4000 });
          console.log('Opened', url);
          return url;
        }catch(err){ lastErr = err; console.warn('Could not open', url, err.message); }
      }
      // wait a bit before retrying
      await new Promise(r=>setTimeout(r, 500));
    }
    throw lastErr || new Error('No hosts available after waiting');
  }

  const uploadPageUrl = await tryGotoCandidates(page, 'upload-file.html');
  await page.waitForSelector('input[type=file]');
  const input = await page.$('input[type=file]');
  await input.uploadFile(uploadFilePath);

  // Submit the form
  await Promise.all([
    page.click('button[type=submit]'),
    page.waitForResponse(resp => /\/upload/.test(resp.url()) && resp.status() === 200, { timeout: 5000 }).catch(()=>null)
  ]);

  // Wait for code to appear in result
  await page.waitForSelector('#shareCode', { timeout: 5000 });
  const code = await page.$eval('#shareCode', el => el.textContent.trim());
  console.log('Uploaded. Code:', code);

  const receivePage = uploadPageUrl.replace('/upload-file.html','') + `/receive-file.html?code=${code}`;
  await page.goto(receivePage, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.result, .card', { timeout: 5000 }).catch(()=>{});

  const screenshotPath = path.resolve(__dirname, '..', 'smoke_receive.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to', screenshotPath);

  await browser.close();
  // shut down server
  try{ serverProc.kill(); }catch(e){}
})();
