import {MailProcessor} from './mail/MailProcessor.js';
import {loadConfig, writeLatestMailInfo} from './util/configManager.js';
import {Statistics} from "./logger/Statistics.js";
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ConfigPath = path.join(__dirname, '../config.json');

await main(ConfigPath);

async function main(configPath: string) {
  const config = loadConfig(configPath);
  while (true) {
    try {
      switch (process.argv.length) {
        // No arguments
        case 2: {
          const mailProcessor = new MailProcessor(config.imap, config.smtp, config.fwd, config.statistics, config.auto_generate_do_not_modify === undefined ? {} : config.auto_generate_do_not_modify);
          mailProcessor.setSucceedCallBack(writeLatestMailInfo.bind(null, ConfigPath, config, mailProcessor.getLatestMailInfo()));
          mailProcessor.connect();
          break;
        }

        case 3: {
          argProcess(config);
          break;
        }

        default:
          console.error('Invalid argument');
          break;
      }
    } catch (e) {
      console.error(e);
    }
    if (!config.daemon.enable) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, config.daemon.interval));
  }
}

function argProcess(config: any) {
  switch (process.argv[2]) {
    case "export": {
      const statisticsLog = new Statistics(config.statistics_log);
      statisticsLog.export();
      break;
    }

    default:
      console.error('Invalid argument');
      break;
  }
}
