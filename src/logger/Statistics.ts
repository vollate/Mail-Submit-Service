import fs from 'fs';
import {loadConfig, writeLog} from '../util/configManager.js';

export class Statistics {
  private log_content: any;
  private readonly config: any;

  public constructor(config: any) {
    this.config = config;
    const log_path = config.log_path;
    if (!fs.existsSync(log_path)) {
      fs.writeFileSync(config.log_path, '{}');
    }
    this.log_content = loadConfig(log_path);
  }

  public addForwardRecord(fwdReceiver: string, originalMail: any) {
    if (undefined === this.log_content[fwdReceiver]) {
      this.log_content[fwdReceiver] = [];
    }
    delete originalMail.attachments;
    this.log_content[fwdReceiver].push(originalMail);
    writeLog(this.config.log_path, this.log_content);
  }

  public export() {
    throw Error('not implement');
  }
}
