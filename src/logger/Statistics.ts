import fs from 'fs';
import {loadConfig, writeLog} from '../util/configManager.js';
import ExcelJS from 'exceljs';

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
    const filenames: Array<string> = [];
    if (originalMail.attachments !== undefined) {
      originalMail.attachments.forEach((attachment: any) => {
        filenames.push(attachment.fileName);
      });
    } else {
      console.warn('No attachments found in mail');
      filenames.push(originalMail.from[0].name + ' <!!! no attachment found>');
    }
    delete originalMail.attachments;
    originalMail.attachments = filenames;
    this.log_content[fwdReceiver].push(originalMail);
    writeLog(this.config.log_path, this.log_content);
  }

  public async export() {
    const sheet1 = 'Sheet 1';
    const workbook = this.createWorksheet(sheet1);
    const worksheet = workbook.getWorksheet(sheet1) || workbook.addWorksheet(sheet1);
    for (const receiver in this.log_content) {
      for (const mail of this.log_content[receiver]) {
        worksheet.addRow({
          sub: mail.attachments !== undefined ? mail.attachments[0] : mail.from[0].name,
          ass: receiver,
          sub_mail: mail.from[0].address,
          ass_mail: receiver
        });
      }
    }
    return this.writeWorksheet(workbook, this.config.statistics);
  }

  private createWorksheet(name: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(name);
    worksheet.columns = [
      {header: 'Submitter', key: 'sub', width: 40},
      {header: 'Assignee', key: 'ass', width: 40},
      {header: 'Submitter Mail', key: 'sub_mail', width: 40},
      {header: 'Assignee Mail', key: 'ass_mail', width: 40},
    ];
    return workbook;
  }

  private async writeWorksheet(workbook: ExcelJS.Workbook, savePath: string) {
    return workbook.xlsx.writeFile('statistic.xlsx');
  }
}
