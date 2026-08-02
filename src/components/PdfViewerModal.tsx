import React, { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Download, Loader2 } from 'lucide-react';
import { StudyBook } from '../types';
import { getPdfData } from '../utils/pdfStorage';

interface PdfViewerModalProps {
  book: StudyBook;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ book, onClose }) => {
  const [pdfUri, setPdfUri] = useState<string | null>(book.pdfDataUri || null);
  const [loading, setLoading] = useState<boolean>(!book.pdfDataUri);

  useEffect(() => {
    let isMounted = true;
    if (!pdfUri && book.id) {
      setLoading(true);
      getPdfData(book.id).then((data) => {
        if (isMounted) {
          if (data) setPdfUri(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [book.id, book.pdfDataUri]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-white border border-slate-200 rounded-xl p-4 text-slate-800 shadow-2xl flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
          <div className="flex items-center gap-2 max-w-xl truncate">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
            <h3 className="font-bold text-sm text-slate-900 truncate">
              {book.title}
            </h3>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              Page {book.currentPage} of {book.totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pdfUri && (
              <a
                href={pdfUri}
                download={book.pdfName || `${book.title}.pdf`}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-slate-200 font-semibold transition-colors cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content iframe / viewer */}
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-600">Loading document...</p>
            </div>
          ) : pdfUri ? (
            <iframe
              src={pdfUri}
              className="w-full h-full border-none"
              title={book.title}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <FileText className="w-16 h-16 text-slate-300" />
              <div className="space-y-1 max-w-md">
                <h4 className="font-bold text-sm text-slate-800">
                  No embedded PDF file preview available
                </h4>
                <p className="text-xs text-slate-500">
                  This study project was added manually with total page count ({book.totalPages} pages). You can re-upload a PDF file to preview it here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
