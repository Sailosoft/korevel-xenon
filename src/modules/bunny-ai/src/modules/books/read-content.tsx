// read-content.tsx
import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Copy } from "lucide-react";

interface BUIBookChapterReadContentModuleProps {
  content: string;
}

export default function BUIBookChapterReadContentModule({
  content,
}: BUIBookChapterReadContentModuleProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopTextToSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleTextToSpeech = () => {
    if (!("speechSynthesis" in window)) {
      console.error("Text to speech is not supported in this browser");
      return;
    }

    // Toggle: clicking again stops the speech
    if (isSpeaking) {
      stopTextToSpeech();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Stop speech when the component unmounts (e.g., modal closed)
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy content:", error);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbox */}
      <div className="mb-2 flex w-full items-center gap-1">
        <button
          type="button"
          onClick={handleTextToSpeech}
          title={isSpeaking ? "Stop" : "Text to Speech"}
          className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          {isSpeaking ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleCopyContent}
          title="Copy Content"
          className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <hr className="my-2 border-slate-200" />
      {/* Content */}
      <div className="flex-1 text-sm text-slate-800 leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-[#ff2d20] [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_hr]:my-6 [&_hr]:border-slate-200">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}