import Imap from 'imap';
import {MailParser} from 'mailparser-mit';
import nodemailer from 'nodemailer';
import {isSubjectMatch} from '../util/subjectMatcher';

export class MailProcessor {
  private imap: Imap;
  private smtpConfig: any;
  private forwardTo: string;
  private forwardTitleTemp: string;
  private subjectRegex: RegExp;

  constructor(imapConfig: any, smtpConfig: any, forwardTo: string, forwardTitleTemp: string, subjectRegex: string) {
    this.imap = new Imap(imapConfig);
    this.smtpConfig = smtpConfig;
    this.forwardTo = forwardTo;
    this.forwardTitleTemp = forwardTitleTemp;
    this.subjectRegex = new RegExp(subjectRegex);
  }

  public connect() {
    this.imap.once('ready', this.onReady.bind(this));
    this.imap.once('error', this.onError.bind(this));
    this.imap.once('end', this.onEnd.bind(this));
    this.imap.connect();
  }

  private onReady() {
    this.openInbox((err: Error | null) => {
      if (err) throw err;
      this.searchUnseen();
    });
  }

  private openInbox(cb: (err: Error | null) => void) {
    this.imap.openBox('INBOX', false, cb);
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

      if (isSubjectMatch(this.subjectRegex, subject)) {
        console.log(`[Title matched] ${subject}`);
        this.forwardEmail(parsedMail);
      } else {
        console.log(`[Title missmatch] ${subject}`);
      }
    });

    mailParser.on('error', (err) => console.error('[Parse mail fault]', err));

    mailParser.write(mailBuffer);
    mailParser.end();
  }

  private forwardEmail(mail: any) {
    const transporter = nodemailer.createTransport(this.smtpConfig);

    const forwardOptions: nodemailer.SendMailOptions = {
      from: this.smtpConfig.auth.user,
      to: this.forwardTo,
      subject: this.forwardTitleTemp.replace('{OrigihalSubject}', mail.subject),
      html: mail.html || mail.textAsHtml || '',
      attachments: mail.attachments.map((attachment: any) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    };

    transporter.sendMail(forwardOptions, (error, info) => {
      if (error) {
        return console.error('<Forward error>', error);
      }
      console.log('[Forward succeed, mail ID]', info.messageId);
    });
  }

  private onError(err: Error | null) {
    console.error('<IMAP fault>', err);
  }

  private onEnd() {
    console.log('[Connection closed]');
  }
}

