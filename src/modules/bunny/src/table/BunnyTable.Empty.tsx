import { Inbox } from "lucide-react";

export default function BunnyTableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-2 text-default-400 bg-base-100">
      <Inbox size={40} strokeWidth={1} />
      <p className="text-sm">No data found in this table.</p>
    </div>
  );
}
