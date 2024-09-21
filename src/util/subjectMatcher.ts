export function isSubjectMatch(subjectRegex: RegExp, subject: string | undefined): boolean {
  return subjectRegex.test(subject || '');
}

