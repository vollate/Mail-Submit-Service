import {MailProcessor} from './mail/MailProcessor';
import {loadConfig} from './util/configManager';
import path from 'path';

const config = loadConfig(path.join(__dirname, 'config.json'));
const mailProcessor = new MailProcessor(config.imap, config.smtp, config.forward_to, config.forward_title_temp, config.subject_regex);

mailProcessor.connect();
