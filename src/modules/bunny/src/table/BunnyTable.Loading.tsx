import { Spinner } from "@heroui/react";

export default function BunnyTableLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-default-500">Loading data...</p>
    </div>
  );
}
