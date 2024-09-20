export function isSubjectMatch(subjectRegex: RegExp, subject: string | undefined) {
    return subjectRegex.test(subject || '');
}

