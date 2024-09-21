import {MailProcessor} from './mail/MailProcessor';
import {loadConfig} from './util/configManager';
import {StatisticsLog} from "./log/StatisticsLog";
import path from 'path';


// main function
const config = loadConfig(path.join(__dirname, 'config.json'));
try {
  switch (process.argv.length) {
    // No arguments
    case 2: {
      const mailProcessor = new MailProcessor(config.imap, config.smtp, config.fwd, config.statistics);
      mailProcessor.connect();
      break;
    }

    case 4: {
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
      statisticsLog.export(process.argv[3]);
      break;
    }

    default:
      console.error('Invalid argument');
      break;
  }
}
