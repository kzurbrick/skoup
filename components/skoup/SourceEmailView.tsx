"use client";

import type { EmailSource } from "@/types/feed";

type SourceEmailViewProps = {
  source: EmailSource;
  onClose: () => void;
};

export default function SourceEmailView({ source, onClose }: SourceEmailViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Source Email</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {(source.subject || source.sender || source.receivedDate) && (
            <div className="mb-4 space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              {source.subject && (
                <p>
                  <span className="font-medium text-slate-500">Subject: </span>
                  <span className="text-slate-800">{source.subject}</span>
                </p>
              )}
              {source.sender && (
                <p>
                  <span className="font-medium text-slate-500">From: </span>
                  <span className="text-slate-800">{source.sender}</span>
                </p>
              )}
              {source.receivedDate && (
                <p>
                  <span className="font-medium text-slate-500">Date: </span>
                  <span className="text-slate-800">{source.receivedDate}</span>
                </p>
              )}
            </div>
          )}

          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
            {source.body}
          </pre>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
