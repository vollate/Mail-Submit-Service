import Imap from 'imap';
import {MailParser} from 'mailparser-mit';
import nodemailer from 'nodemailer';
import {isSubjectMatch} from '../util/subjectMatcher.js';
import {Statistics} from '../logger/Statistics.js';

export class MailProcessor {
  private imap: Imap;
  private readonly smtpConfig: any;
  private readonly fwdConfig: any;
  private readonly subjectRegex: RegExp;
  private statisticsLog: Statistics;
  private persistenceConfig: any;
  private successfulSendCallBack: () => void = () => {
  };

  constructor(imapConfig: any, smtpConfig: any, fwdConfig: any, statisticsConfig: any, persistenceConfig: any) {
    this.imap = new Imap(imapConfig);
    this.smtpConfig = smtpConfig;
    this.fwdConfig = fwdConfig;
    this.statisticsLog = new Statistics(statisticsConfig);
    this.persistenceConfig = persistenceConfig || {};
    this.subjectRegex = new RegExp(fwdConfig.subject_regex);

    if (this.fwdConfig.forward_to === undefined || this.fwdConfig.forward_to.length === 0) {
      throw new Error('No forward email address found');
    }

    if (this.persistenceConfig.next_term === undefined) {
      this.persistenceConfig.next_term = 0;
    }
    if (persistenceConfig.last_mail_timestamp === undefined) {
      if (this.fwdConfig.mode !== 'SINCE') {
        throw new Error('No last mail timestamp found');
      }
      this.persistenceConfig.last_mail_timestamp = new Date(this.fwdConfig.date);
    } else {
      this.persistenceConfig.last_mail_timestamp = persistenceConfig.last_mail_timestamp;
    }
  }

  public connect() {
    this.imap.once('ready', this.onReady.bind(this));
    this.imap.once('error', this.onError.bind(this));
    this.imap.once('end', this.onEnd.bind(this));
    this.imap.connect();
  }

  public getLatestMailInfo(): any {
    return this.persistenceConfig;
  }

  public setSucceedCallBack(func: () => void) {
    this.successfulSendCallBack = func;
  }

  private onReady() {
    this.openInbox((err: Error | null) => {
      if (err) throw err;

      switch (this.fwdConfig.mode) {
        case 'UNSEEN':
          this.searchUnseen();
          break;

        case 'SINCE':
          if (this.fwdConfig.date === undefined) {
            throw new Error('No Date found in SINCE mode');
          }
          this.searchSince(new Date(this.fwdConfig.date));
          break;

        default:
          console.error('[Invalid mode]');
      }
    });
  }

  private closeSendConnection(succeed: boolean) {
    if (succeed) {
      this.successfulSendCallBack();
    }
  }

  private openInbox(cb: (err: Error | null) => void) {
    this.imap.openBox('INBOX', false, cb);
  }

  private searchSince(date: Date) {
    if (date.toString() === 'Invalid Date') {
      throw new Error('Invalid date, check your config');
    }

    const sinceDate = date.toISOString().split('T')[0];

    this.imap.search([['SINCE', sinceDate]], (err, results) => {
      if (err) throw err;

      if (!results || results.length === 0) {
        console.log('[No mail found since ' + sinceDate + ']');
        this.imap.end();
        return;
      }

      const f = this.imap.fetch(results, {bodies: '', markSeen: true});
      f.on('message', this.onMessage.bind(this));
      f.once('error', (err) => console.error('<Get mail fault>', err));
      f.once('end', () => {
        console.log('[All Done]');
        this.imap.end();
      });
    });
  }


  private searchUnseen() {
    this.imap.search(['UNSEEN'], (err, results) => {
      if (err) throw err;

      if (!results || results.length === 0) {
        console.log('[No new mail found]');
        this.imap.end();
        return;
      }

      const f = this.imap.fetch(results, {bodies: '', markSeen: true});
      f.on('message', this.onMessage.bind(this));
      f.once('error', (err) => console.error('<Get mail fault>', err));
      f.once('end', () => {
        console.log('[All Done]');
        this.imap.end();
      });
    });
  }

  private onMessage(msg: any, seqno: number) {
    console.log('[Process mail]: #%d', seqno);
    let buffer: Buffer[] = [];

    msg.on('body', (stream: any) => {
      stream.on('data', (chunk: any) => buffer.push(chunk));
      stream.once('end', () => this.parseMail(Buffer.concat(buffer)));
    });

    msg.once('end', () => console.log('[Finish mail] #%d', seqno));
  }

  private parseMail(mailBuffer: Buffer) {
    const mailParser = new MailParser();
    mailParser.on('end', (parsedMail) => {
      const {subject} = parsedMail as any;

      if (!isSubjectMatch(this.subjectRegex, subject)) {
        return;
      }
      if (new Date(parsedMail.date as Date).getTime() <= new Date(this.persistenceConfig.last_mail_timestamp).getTime()) {
        console.log(`===\n[Mail is old] ${subject}\n[Send date] ${parsedMail.date as Date}\n[Lastest date] ${this.persistenceConfig.last_mail_timestamp}\n[Sender] ${parsedMail.from?.[0]?.address || 'Unknown'}`);
        return;
      } else {
        console.log(`===\n[Send date] ${parsedMail.date as Date}`);
        this.persistenceConfig.last_mail_timestamp = parsedMail.date as Date;
      }
      console.log(`[Title matched] ${subject}`);
      this.forwardEmail(parsedMail);
    });

    mailParser.on('error', (err) => console.error('[Parse mail fault]', err));

    mailParser.write(mailBuffer);
    mailParser.end();
  }

  private forwardEmail(mail: any) {
    const transporter = nodemailer.createTransport(this.smtpConfig);
    let title = this.fwdConfig.forward_subject_temp || 'Fwd: {OriginalSubject}';

    let subject = title.replace('{OriginalSubject}', mail.subject || '');
    subject = subject.replace('{OriginalSender}', mail.from[0].address || '');

    const htmlContent = mail.html || mail.text || 'No content';
    const receiver = this.getNextFwdReceiver();
    const forwardOptions: nodemailer.SendMailOptions = {
      from: this.smtpConfig.auth.user,
      to: receiver,
      subject: subject,
      html: htmlContent,
      attachments: (mail.attachments || []).map((attachment: any) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    };

    transporter.sendMail(forwardOptions, (error, info) => {
      if (error) {
        this.closeSendConnection(false);
        return console.error('<Forward error>', error);
      }
      this.closeSendConnection(true);
      this.statisticsLog.addForwardRecord(receiver, mail);
      console.log(`[Forward succeed] Mail ID: ${info.messageId}, Target: ${receiver}`);
    });
  }

  private getNextFwdReceiver() {
    const index: number = this.persistenceConfig.next_term % this.fwdConfig.forward_to.length;
    this.persistenceConfig.next_term = index + 1;
    return this.fwdConfig.forward_to[index];
  }

  private onError(err: Error | null) {
    console.error('<IMAP fault>', err);
  }

  private onEnd() {
    console.log('[Connection closed]');
  }
}
