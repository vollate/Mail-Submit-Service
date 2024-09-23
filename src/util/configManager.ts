import fs from 'fs';

export function loadConfig(configPath: string): any {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export function writeLatestMailInfo(configPath: string, originalConfig: any, persistenceConfig: any): void {
  const newConfig = {...originalConfig};
  newConfig.auto_generate_do_not_modify = persistenceConfig;
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
}

