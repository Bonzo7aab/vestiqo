/**
 * Contest offer document helpers (run: npx tsx tests/unit/contest-offer-form-documents.test.ts)
 */
import assert from 'node:assert/strict';
import {
  OFFER_DOCUMENT_MAX_FILES,
  contestOfferDocumentCapMessage,
  contestOfferDocumentRejectionMessage,
  contestOfferDocumentTruncateWarning,
  contestOfferUploadFailureMessage,
  remainingOfferDocumentSlots,
  takeAcceptedContestFiles,
} from '../../src/lib/contest-offer/contest-offer-form-documents';

assert.equal(remainingOfferDocumentSlots(0, 0), OFFER_DOCUMENT_MAX_FILES);
assert.equal(remainingOfferDocumentSlots(4, 3), 3);
assert.equal(remainingOfferDocumentSlots(7, 3), 0);
assert.equal(remainingOfferDocumentSlots(0, 10), 0);

const mixedKeep = takeAcceptedContestFiles(['a.pdf', 'b.pdf', 'c.pdf'], 2);
assert.deepEqual(mixedKeep.filesToAdd, ['a.pdf', 'b.pdf']);
assert.equal(mixedKeep.truncated, true);

const noSlots = takeAcceptedContestFiles(['a.pdf'], 0);
assert.deepEqual(noSlots.filesToAdd, []);
assert.equal(noSlots.truncated, true);

assert.equal(
  contestOfferDocumentRejectionMessage({
    file: { name: 'huge.pdf' },
    errors: [{ code: 'file-too-large', message: 'File is larger than 10485760 bytes' }],
  }),
  'Plik "huge.pdf" jest zbyt duży. Maksymalny rozmiar: 10 MB',
);
assert.equal(
  contestOfferDocumentRejectionMessage(
    {
      file: { name: 'notes.txt' },
      errors: [{ code: 'file-invalid-type', message: 'File type not allowed' }],
    },
    'offerDocumentation',
  ),
  'Nieprawidłowy typ pliku "notes.txt". Dozwolone: PDF, DOC, DOCX, XLS, XLSX, obrazy',
);
assert.equal(
  contestOfferDocumentRejectionMessage(
    {
      file: { name: 'notes.txt' },
      errors: [{ code: 'file-invalid-type', message: 'File type not allowed' }],
    },
    'formal',
  ),
  'Nieprawidłowy typ pliku "notes.txt". Dozwolone: PDF, DOC, DOCX lub obrazy',
);
assert.equal(
  contestOfferDocumentRejectionMessage(
    {
      file: { name: 'notes.txt' },
      errors: [{ code: 'file-invalid-type', message: 'File type not allowed' }],
    },
    'deposit',
  ),
  'Nieprawidłowy typ pliku "notes.txt". Dozwolone: PDF lub obrazy',
);
assert.equal(
  contestOfferDocumentRejectionMessage({
    file: { name: 'empty.pdf' },
    errors: [{ code: 'file-too-small', message: 'File is smaller than 1 bytes' }],
  }),
  'Plik "empty.pdf" jest pusty lub uszkodzony',
);
assert.equal(
  contestOfferDocumentRejectionMessage({
    file: { name: 'extra.pdf' },
    errors: [{ code: 'too-many-files', message: 'Too many files' }],
  }),
  contestOfferDocumentCapMessage(),
);
assert.equal(
  contestOfferDocumentRejectionMessage(
    {
      file: { name: 'extra.pdf' },
      errors: [{ code: 'too-many-files', message: 'Too many files' }],
    },
    'deposit',
  ),
  'Można dodać tylko jeden plik. Plik "extra.pdf" nie został dodany',
);

assert.equal(
  contestOfferDocumentTruncateWarning(1, 4),
  'Dodano 1 z 4 plików (maksymalnie 10 łącznie)',
);

assert.equal(
  contestOfferUploadFailureMessage([{ file: 'spec.pdf', error: new Error('fail') }]),
  'Nie udało się wgrać plików: spec.pdf. Oferta nie została zapisana.',
);
assert.equal(
  contestOfferUploadFailureMessage([{ file: 'a.pdf' }, { file: 'b.docx' }]),
  'Nie udało się wgrać plików: a.pdf, b.docx. Oferta nie została zapisana.',
);
assert.equal(
  contestOfferUploadFailureMessage([new Error('network')]),
  'Nie udało się wgrać dokumentów. Oferta nie została zapisana.',
);

console.log('contest-offer-form-documents tests passed');
