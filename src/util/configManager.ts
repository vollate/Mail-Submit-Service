import fs from 'fs';

export function loadConfig(configPath: string) {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export function writeLatestMailInfo(info: object) {
  fs.writeFileSync('latest_mail_info.json', JSON.stringify(info));
}