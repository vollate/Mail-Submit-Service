import {MailProcessor} from './mail/MailProcessor';
import {loadConfig, writeLatestMailInfo} from './util/configManager';
import {StatisticsLog} from "./log/StatisticsLog";
import path from 'path';

const ConfigPath = path.join(__dirname, '../config.json');

// main function
const config = loadConfig(ConfigPath);
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
      argProcess();
      break;
    }

    default:
      console.error('Invalid argument');
      break;
  }
} catch (e) {
  console.error(e);
}

// End of main


function argProcess() {
  switch (process.argv[2]) {
    case "export": {
      const statisticsLog = new StatisticsLog(config.statistics_log);
      statisticsLog.export();
      break;
    }

    default:
      console.error('Invalid argument');
      break;
  }
}
