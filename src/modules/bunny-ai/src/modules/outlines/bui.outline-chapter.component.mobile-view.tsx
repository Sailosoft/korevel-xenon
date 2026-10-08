import { BUIOutlineItemEntity } from "./bui.outline.entity";

export default function BUIOutlineComponentMobileView({
  row,
}: {
  row: BUIOutlineItemEntity;
}) {
  const formattedWordCount =
    typeof row.wordCount === "number"
      ? row.wordCount.toLocaleString()
      : row.wordCount || "0";

  return (
    <div className="flex flex-col gap-2 w-full pt-1">
      <div className="flex gap-1">
        <h4 className="font-semibold text-default-900 text-sm line-clamp-1">
          {row.title || "Untitled Item"}
        </h4>
      </div>

      {row.description && (
        <p className="text-default-500 text-xs line-clamp-2 leading-relaxed">
          {row.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-1 pt-2 border-t border-default-100 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-default-400">Status:</span>
          <span
            className={`font-medium capitalize ${
              row.status === "done" || row.status === "being_generated"
                ? "text-success-600"
                : row.status === "pending"
                  ? "text-warning-600"
                  : "text-default-700"
            }`}
          >
            {row.status || "Unknown"}
          </span>
        </div>

        <div className="text-default-400">
          Words:{" "}
          <span className="text-default-700 font-medium">
            {formattedWordCount}
          </span>
        </div>
      </div>
    </div>
  );
}
