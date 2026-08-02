import React, { useState } from 'react';
import { Plus, BookOpen, Check, Trash2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { StudyBook } from '../types';
import {
  addBook,
  getBooks,
  updateBookProgress,
  deleteBook,
  getBookStatistics,
} from '../utils/storage';

interface StudyProgressProps {
  books: StudyBook[];
  onBooksChange: (books: StudyBook[]) => void;
  onOpenPdf: (book: StudyBook) => void;
  onUpdateSummary: (overdue: number, open: number, closed: number) => void;
}

export const StudyProgress: React.FC<StudyProgressProps> = ({
  books,
  onBooksChange,
  onOpenPdf,
  onUpdateSummary,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pdfName, setPdfName] = useState<string | undefined>();
  const [pdfDataUri, setPdfDataUri] = useState<string | undefined>();
  const [addError, setAddError] = useState('');

  // Resume / Mark progress state
  const [selectedBook, setSelectedBook] = useState<StudyBook | null>(null);
  const [progressPage, setProgressPage] = useState('');

  // Delete confirmation state
  const [bookToDelete, setBookToDelete] = useState<StudyBook | null>(null);

  // Compute counts
  React.useEffect(() => {
    let overdue = 0;
    let open = 0;
    let closed = 0;

    books.forEach((b) => {
      if (b.completed) {
        closed++;
      } else {
        open++;
        const stats = getBookStatistics(b);
        if (stats.daysLeft <= 0) overdue++;
      }
    });

    onUpdateSummary(overdue, open, closed);
  }, [books, onUpdateSummary]);

  // Extract PDF page count helper
  const extractPdfPageCount = (buffer: ArrayBuffer): number | null => {
    try {
      const text = new TextDecoder('latin1').decode(buffer);
      const matches = [...text.matchAll(/\/Count\s+(\d+)/g)];
      if (matches.length > 0) {
        const counts = matches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n) && n > 0);
        if (counts.length > 0) {
          return Math.max(...counts);
        }
      }
    } catch (err) {
      console.error('Error extracting PDF page count', err);
    }
    return null;
  };

  // Handle PDF file upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setAddError('Please select a valid PDF file (.pdf).');
      return;
    }

    setPdfName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.pdf$/i, ''));
    }

    // Auto extract page count
    const bufferReader = new FileReader();
    bufferReader.onload = () => {
      if (bufferReader.result instanceof ArrayBuffer) {
        const count = extractPdfPageCount(bufferReader.result);
        if (count && count > 0) {
          setTotalPages(String(count));
        }
      }
    };
    bufferReader.readAsArrayBuffer(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPdfDataUri(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!title.trim()) {
      setAddError('Book title is required');
      return;
    }

    const pages = parseInt(totalPages, 10);
    if (isNaN(pages) || pages < 1) {
      setAddError('Total pages must be a positive number');
      return;
    }

    if (!deadline.trim()) {
      setAddError('Deadline date is required');
      return;
    }

    // Format deadline string to standard YYYY-MM-DD
    let isoDeadline = deadline.trim();
    if (isoDeadline.includes('-')) {
      const parts = isoDeadline.split('-');
      if (parts[0].length === 2 && parts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        isoDeadline = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Validate deadline date is today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let deadlineDate: Date;
    if (isoDeadline.includes('-')) {
      const parts = isoDeadline.split('-');
      if (parts[0].length === 4) {
        deadlineDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        deadlineDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else {
      deadlineDate = new Date(isoDeadline);
    }

    if (isNaN(deadlineDate.getTime())) {
      setAddError('Invalid date format. Please select or enter a valid date.');
      return;
    }

    if (deadlineDate.getTime() < today.getTime()) {
      setAddError('Deadline date must be today or in the future.');
      return;
    }

    try {
      addBook(title.trim(), pages, isoDeadline, pdfName, pdfDataUri);
      // Reload books from storage to get the newly created book
      const updated = getBooks();
      onBooksChange(updated);

      // Reset form
      setTitle('');
      setTotalPages('');
      setDeadline('');
      setPdfName(undefined);
      setPdfDataUri(undefined);
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create study project');
    }
  };

  const handleSaveProgress = () => {
    if (!selectedBook) return;
    const pageNum = parseInt(progressPage, 10);
    if (isNaN(pageNum) || pageNum < 1) return;

    const updated = updateBookProgress(selectedBook.id, pageNum);
    onBooksChange(updated);
    setSelectedBook(null);
  };

  const handleDeleteConfirmed = () => {
    if (!bookToDelete) return;
    const updated = deleteBook(bookToDelete.id);
    onBooksChange(updated);
    setBookToDelete(null);
  };

  const quickAddPages = (num: number) => {
    if (!selectedBook) return;
    const current = parseInt(progressPage, 10) || selectedBook.currentPage;
    const next = Math.min(current + num, selectedBook.totalPages);
    setProgressPage(String(next));
  };

  return (
    <div className="space-y-3">
      {/* List of Books */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {books.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            No study material active. Click (+) above to add a PDF or book.
          </div>
        ) : (
          books.map((book) => {
            const stats = getBookStatistics(book);
            const isCompleted = book.completed;

            return (
              <div
                key={book.id}
                className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-slate-800 shadow-2xs hover:border-indigo-300 transition-colors"
              >
                {/* Book Title as clickable link */}
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onOpenPdf(book)}
                    className="text-left font-semibold text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors flex items-center gap-1.5 line-clamp-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                    <span>{book.title}</span>
                  </button>

                  {isCompleted && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      Completed
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>{stats.pct}% Completed</span>
                    <span>
                      Page {book.currentPage} / {book.totalPages}
                    </span>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400">Today's Goal</p>
                    <p className="text-[11px] font-bold text-slate-700">
                      {book.dailyGoal} pgs
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Pages Left</p>
                    <p className="text-[11px] font-bold text-slate-700">
                      {stats.pagesLeft}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Days Left</p>
                    <p
                      className={`text-[11px] font-bold ${
                        isCompleted
                          ? 'text-emerald-600'
                          : stats.daysLeft <= 0
                          ? 'text-rose-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {isCompleted ? '✓ Done' : `${stats.daysLeft} d`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Backlog</p>
                    <p
                      className={`text-[11px] font-bold ${
                        stats.backlog > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {stats.backlog} pgs
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {!isCompleted ? (
                    <button
                      onClick={() => {
                        setSelectedBook(book);
                        setProgressPage(String(book.currentPage));
                      }}
                      className="text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer"
                    >
                      Mark Progress
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => setBookToDelete(book)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Study Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateBook}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 text-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Create Study Project
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="text-xs bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{addError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Upload PDF File (Optional)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-indigo-600 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Book / Material Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CAT VARC Reading Passages"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Total Pages *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Deadline Date (Today or later) *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Progress Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-xs text-slate-900 truncate pr-2">
                Resume — {selectedBook.title}
              </h3>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Total pages in project: {selectedBook.totalPages}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Current Page
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBook.totalPages}
                  value={progressPage}
                  onChange={(e) => setProgressPage(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Quick Add buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => quickAddPages(1)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-1 rounded-md text-slate-700 transition-colors cursor-pointer border border-slate-200"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => quickAddPages(5)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-1 rounded-md text-slate-700 transition-colors cursor-pointer border border-slate-200"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => quickAddPages(10)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-1 rounded-md text-slate-700 transition-colors cursor-pointer border border-slate-200"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProgress}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 text-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Delete Study Project?
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove "{bookToDelete.title}"?
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add trigger exposed via parent or ref */}
      <button
        id="trigger-add-study-book"
        onClick={() => setShowAddModal(true)}
        className="hidden"
      />
    </div>
  );
};
