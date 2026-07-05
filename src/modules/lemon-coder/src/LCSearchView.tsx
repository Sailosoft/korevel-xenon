"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, File, Folder, Loader2, X } from "lucide-react";
import type { LCFileTreeItem } from "./LCInterface";

interface LCSearchViewProps {
  dirHandle: FileSystemDirectoryHandle | null;
  onSelectFile: (item: LCFileTreeItem) => void;
}

type SearchMode = "name" | "content";

interface SearchResult {
  name: string;
  path: string;
  handle: FileSystemFileHandle;
}

const IGNORE_LIST = ["node_modules", ".git", "dist", ".next", "build", "out"];

const DEBOUNCE_MS = 300;

export default function LCSearchView({ dirHandle, onSelectFile }: LCSearchViewProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("name");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Keep refs of latest search params so the debounced function always uses current values
  const queryRef = useRef(query);
  const modeRef = useRef(mode);
  const dirHandleRef = useRef(dirHandle);
  queryRef.current = query;
  modeRef.current = mode;
  dirHandleRef.current = dirHandle;

  const doSearch = useCallback(async () => {
    const currentDirHandle = dirHandleRef.current;
    const currentQuery = queryRef.current;
    const currentMode = modeRef.current;

    if (!currentDirHandle || !currentQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const foundFiles: SearchResult[] = [];
    const searchTerm = currentQuery.toLowerCase();

    async function traverse(handle: FileSystemDirectoryHandle, path: string = "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const entry of (handle as any).values()) {
        const currentPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === "directory") {
          if (IGNORE_LIST.includes(entry.name)) continue;
          await traverse(entry as FileSystemDirectoryHandle, currentPath);
        } else if (entry.kind === "file") {
          const fileHandle = entry as FileSystemFileHandle;

          if (currentMode === "name") {
            if (fileHandle.name.toLowerCase().includes(searchTerm)) {
              foundFiles.push({ name: fileHandle.name, path: currentPath, handle: fileHandle });
            }
          } else {
            try {
              const file = await fileHandle.getFile();
              const text = await file.text();
              if (text.toLowerCase().includes(searchTerm)) {
                foundFiles.push({ name: fileHandle.name, path: currentPath, handle: fileHandle });
              }
            } catch (e) {
              console.error(`Could not read file ${currentPath}:`, e);
            }
          }
        }
      }
    }

    try {
      await traverse(currentDirHandle);
      setResults(foundFiles);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce: clear pending search whenever query or mode changes, then re-schedule
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        doSearch();
      } else {
        // Clear results when query drops below threshold
        setResults([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode, doSearch]);

  const handleFileClick = (result: SearchResult) => {
    onSelectFile({
      id: result.path,
      name: result.name,
      path: result.path,
      isDirectory: false,
      children: undefined,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc]">
      {/* Search Controls */}
      <div className="p-3 border-b border-[#333333] space-y-3">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-4 h-4 text-[#858585]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#3c3c3c] text-sm border border-transparent focus:border-[#e5c07b] outline-none rounded transition-colors"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="absolute right-2 p-0.5 hover:bg-[#555] rounded transition-colors"
            >
              <X className="w-3 h-3 text-[#858585]" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("name")}
            className={`flex-1 py-1 text-xs rounded transition-colors ${mode === "name" ? "bg-[#e5c07b] text-black font-medium" : "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"}`}
          >
            File Name
          </button>
          <button
            onClick={() => setMode("content")}
            className={`flex-1 py-1 text-xs rounded transition-colors ${mode === "content" ? "bg-[#e5c07b] text-black font-medium" : "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"}`}
          >
            File Content
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#858585]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Searching project...</span>
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col">
            {results.map((res, idx) => (
              <button
                key={`${res.path}-${idx}`}
                onClick={() => handleFileClick(res)}
                className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[#2a2d2e] border-b border-[#333333]/50 group transition-colors"
              >
                <File className="w-3.5 h-3.5 text-[#858585] group-hover:text-[#e5c07b]" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs text-[#cccccc] truncate font-medium">{res.name}</span>
                  <span className="text-[10px] text-[#666] truncate">{res.path}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs text-[#858585] px-8 text-center">
            {query.length < 2 ? (
              "Enter at least 2 characters to search."
            ) : (
              "No files matched your search criteria."
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
