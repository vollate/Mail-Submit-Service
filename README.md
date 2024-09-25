# Mail-Submit-Service

An simple assignment submit service for students. Base on mail forwarding.

The submitted mail will be forwarded to the assigned reviewer's mailbox.

## Usage

1. Clone this repository to your server.
2. Run `pnpm install` to install the dependencies.
3. Create a config file named `config.json` in the root directory of this repository. You could copy and modify the file
   `config-template.json` as a template.
4. Run `pnpm start` to start the service.

## Config Schema

```json
{
  "imap": {
    "user": "xxxx@example.com",
    "password": "xxxx",
    "host": "imap.example.com",
    "port": 993,
    "tls": true
  },
  "smtp": {
    "host": "smtp.example.com",
    "port": 465,
    "secure": true,
    "auth": {
      "user": "xxxx@example.com",
      "pass": "passwd"
    }
  },
  "fwd": {
    "forward_to": [
      "1@example.com",
      "2@example.com"
    ],
    "mode": "SINCE",
    "date": "2024-09-20",
    "forward_subject_temp": "Fwd From: {OriginalSender}, Subject: {OriginalSubject}",
    "subject_regex": "^Just Test$"
  },
  "daemon": {
    "enable": true,
    "interval": 1800000
  },
  "statistics": {
    "log_path": "statistic.json"
  }
}
```

### imap & smtp

Set up your mail service port, domain, username, password, etc.

### fwd

- `forward_to`: The mail address you want to forward to.
- `mode`: The mode of the filter. It could be `SINCE` or `UNSEEN`.
    - `SINCE`: Forward the mail since the specified date.
    - `UNSEEN`: Forward the unseen mail.
- `date`: The date you want to filter. **Only work when the forward mode is `SINCE`.** It should be in the format
  `YYYY-MM-DD`.
- `forward_subject_temp`: The subject of the forwarded mail. You could use `{OriginalSender}` and `{OriginalSubject}` to
  insert the original sender and subject.
- `subject_regex`: The regex pattern of the subject. *The mail whose subject does not match the pattern will not be
  forwarded.*

### daemon

- `enable`: Whether to enable the daemon mode.
- If it is enabled, the service will run in the background and check the
  mail every `interval` milliseconds.

### statistics

- `log_path`: The path of the statistics file. The service will record forwarded mail information in this file.