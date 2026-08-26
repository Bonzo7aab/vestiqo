/**
 * Contest creation document helpers and validation
 * (run: npx tsx tests/unit/contest-form-documents.test.ts)
 */
import assert from 'node:assert/strict';
import {
  CONTEST_DOCUMENT_MAX_FILES,
  contestDocumentCapMessage,
  contestDocumentRejectionMessage,
  contestDocumentTruncateWarning,
  contestUploadFailureMessage,
  formatContestFileSize,
  parseContestDocumentSize,
  remainingContestDocumentSlots,
  takeAcceptedContestFiles,
} from '../../src/lib/contest/contest-form-documents';
import { getTenderContestFormFieldErrors } from '../../src/lib/contest/contest-form-validation';
import { createEmptyTenderContestForm } from '../../src/types/tender-contest';

assert.equal(formatContestFileSize(0), '0 B');
assert.equal(formatContestFileSize(512), '512 B');
assert.equal(formatContestFileSize(1024), '1 KB');
assert.equal(formatContestFileSize(1536), '1.5 KB');
assert.equal(formatContestFileSize(10 * 1024 * 1024), '10 MB');
assert.equal(formatContestFileSize(-1), '');

assert.equal(remainingContestDocumentSlots(0, 0), CONTEST_DOCUMENT_MAX_FILES);
assert.equal(remainingContestDocumentSlots(5, 10), 5);
assert.equal(remainingContestDocumentSlots(15, 10), 0);
assert.equal(remainingContestDocumentSlots(0, 20), 0);

const mixedKeep = takeAcceptedContestFiles(['a.pdf', 'b.pdf', 'c.pdf'], 2);
assert.deepEqual(mixedKeep.filesToAdd, ['a.pdf', 'b.pdf']);
assert.equal(mixedKeep.truncated, true);

const noSlots = takeAcceptedContestFiles(['a.pdf'], 0);
assert.deepEqual(noSlots.filesToAdd, []);
assert.equal(noSlots.truncated, true);

const allFit = takeAcceptedContestFiles(['a.pdf'], 3);
assert.deepEqual(allFit.filesToAdd, ['a.pdf']);
assert.equal(allFit.truncated, false);

assert.equal(
  contestDocumentRejectionMessage({
    file: { name: 'huge.pdf' },
    errors: [{ code: 'file-too-large', message: 'File is larger than 10485760 bytes' }],
  }),
  'Plik "huge.pdf" jest zbyt duży. Maksymalny rozmiar: 10 MB',
);
assert.equal(
  contestDocumentRejectionMessage({
    file: { name: 'notes.txt' },
    errors: [{ code: 'file-invalid-type', message: 'File type not allowed' }],
  }),
  'Nieprawidłowy typ pliku "notes.txt". Dozwolone: PDF, DOC, DOCX, XLS, XLSX, obrazy',
);
assert.equal(
  contestDocumentRejectionMessage({
    file: { name: 'empty.pdf' },
    errors: [{ code: 'file-too-small', message: 'File is smaller than 1 bytes' }],
  }),
  'Plik "empty.pdf" jest pusty lub uszkodzony',
);
assert.equal(
  contestDocumentRejectionMessage({
    file: { name: 'extra.pdf' },
    errors: [{ code: 'too-many-files', message: 'Too many files' }],
  }),
  contestDocumentCapMessage(),
);
assert.equal(
  contestDocumentRejectionMessage({
    file: { name: 'weird.bin' },
    errors: [{ code: 'unknown-dropzone-error', message: 'FileReader abort: NS_ERROR_FAILURE' }],
  }),
  'Nie udało się dodać pliku "weird.bin"',
);

assert.equal(
  contestDocumentTruncateWarning(1, 4),
  'Dodano 1 z 4 plików (maksymalnie 20 łącznie)',
);

assert.equal(
  contestUploadFailureMessage([{ file: 'spec.pdf', error: new Error('fail') }]),
  'Nie udało się wgrać plików: spec.pdf. Konkurs nie został zapisany.',
);
assert.equal(
  contestUploadFailureMessage([{ file: 'a.pdf' }, { file: 'b.docx' }]),
  'Nie udało się wgrać plików: a.pdf, b.docx. Konkurs nie został zapisany.',
);
assert.equal(
  contestUploadFailureMessage([new Error('network')]),
  'Nie udało się wgrać dokumentów. Konkurs nie został zapisany.',
);

assert.equal(parseContestDocumentSize(2048), 2048);
assert.equal(parseContestDocumentSize(undefined), undefined);
assert.equal(parseContestDocumentSize('2048'), undefined);
assert.equal(parseContestDocumentSize(Number.NaN), undefined);

const form = createEmptyTenderContestForm();
form.title = 'Tytuł konkursu';
form.description = 'Opis zakresu';
form.category = 'Remonty';
form.subcategory = 'Malowanie';
form.submissionDeadline = new Date('2030-01-10T12:00:00');
form.evaluationDeadline = new Date('2030-01-20T12:00:00');

const emptyDraft = getTenderContestFormFieldErrors(
  createEmptyTenderContestForm(),
  [],
  [],
  false,
  'draft',
);
assert.deepEqual(emptyDraft, {});

const longTitleDraft = createEmptyTenderContestForm();
longTitleDraft.title = 'x'.repeat(76);
assert.equal(
  getTenderContestFormFieldErrors(longTitleDraft, [], [], false, 'draft').title,
  'Tytuł może mieć maksymalnie 75 znaków',
);

const wadumDraft = createEmptyTenderContestForm();
wadumDraft.depositRequired = true;
wadumDraft.depositAmount = null;
wadumDraft.depositInstructions = '';
const wadumDraftErrors = getTenderContestFormFieldErrors(wadumDraft, [], [], false, 'draft');
assert.equal(wadumDraftErrors.depositAmount, undefined);
assert.equal(wadumDraftErrors.depositInstructions, undefined);

const draftErrors = getTenderContestFormFieldErrors(form, [], [], false, 'draft');
assert.equal(draftErrors.documents, undefined);

const emptyPublish = getTenderContestFormFieldErrors(
  createEmptyTenderContestForm(),
  [],
  [],
  false,
  'active',
);
assert.equal(emptyPublish.title, 'Podaj tytuł konkursu');
assert.equal(emptyPublish.documents, 'Dodaj co najmniej jeden plik dokumentacji konkursowej');
assert.equal(emptyPublish.category, 'Wybierz kategorię');
assert.equal(
  emptyPublish.submissionDeadline,
  'Termin przyjmowania ofert musi być w przyszłości',
);

const publishErrors = getTenderContestFormFieldErrors(form, [], [], false, 'active');
assert.equal(publishErrors.documents, 'Dodaj co najmniej jeden plik dokumentacji konkursowej');

const pastDeadline = { ...form, submissionDeadline: new Date('2020-01-01T12:00:00') };
assert.equal(
  getTenderContestFormFieldErrors(pastDeadline, [{ name: 'spec.pdf' } as File], [], false, 'active')
    .submissionDeadline,
  'Termin przyjmowania ofert musi być w przyszłości',
);

const publishWithPending = getTenderContestFormFieldErrors(
  form,
  [{ name: 'spec.pdf' } as File],
  [],
  false,
  'active',
);
assert.equal(publishWithPending.documents, undefined);
assert.equal(publishWithPending.submissionDeadline, undefined);
assert.equal(publishWithPending.title, undefined);

const publishWithKept = getTenderContestFormFieldErrors(
  form,
  [],
  [{ id: '1', name: 'spec.pdf', url: '', path: 'p', type: 'other', size: 1024 }],
  false,
  'active',
);
assert.equal(publishWithKept.documents, undefined);

console.log('contest-form-documents tests passed');
