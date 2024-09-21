import fs from 'fs';
import {loadConfig} from '../util/configManager';

export class StatisticsLog {
  private dirty: boolean = false;
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

  public export(target_path: string) {

  }
}
