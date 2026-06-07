import { BUIBookChapterEntity } from './bui.book.entity';

export default function BUIBookChapterComponentMobileView({ row }: { row: BUIBookChapterEntity }) {
  // Gracefully handle or format standard types (e.g., localized numbers or capitalized statuses)
  const formattedWordCount = typeof row.wordCount === 'number'
    ? row.wordCount.toLocaleString()
    : row.wordCount || '0';

  return (
    <div className="flex flex-col gap-2 w-full pt-1">
      {/* Title & Chapter Number Line justify-between items-start*/}
      <div className="flex gap-1">
        {row.number !== undefined && (
          <span className="text-sm text-default-400 bg-default-100 text-default-600 rounded-full font-medium whitespace-nowrap">
            Chapter {row.number}:
          </span>
        )}
        <h4 className="font-semibold text-default-900 text-sm line-clamp-1">
          {row.title || "Untitled Chapter"}
        </h4>

      </div>

      {/* Description / Summary Block */}
      {row.description && (
        <p className="text-default-500 text-xs line-clamp-2 leading-relaxed">
          {row.description}
        </p>
      )}

      {/* Footer Meta Details (Status & Word Count) */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-default-100 text-[11px]">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-default-400">Status:</span>
          <span className={`font-medium capitalize ${row.status === 'done' || row.status === 'being_generated'
              ? 'text-success-600'
              : row.status === 'pending'
                ? 'text-warning-600'
                : 'text-default-700'
            }`}>
            {row.status || 'Unknown'}
          </span>
        </div>

        {/* Word Count Display */}
        <div className="text-default-400">
          Words: <span className="text-default-700 font-medium">{formattedWordCount}</span>
        </div>
      </div>
    </div>
  );
}