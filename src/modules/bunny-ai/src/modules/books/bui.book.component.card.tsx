"use client";

import React, { useEffect, useState } from "react";
// Added Disclosure to the HeroUI compound component suite
import { Card, Separator, Disclosure } from "@heroui/react"; 
import { BUIBookEntity } from "./bui.book.entity";
import { buiBookModule } from "./bui.book.module";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BUIBookComponentCardProps {
  bookId: number;
}

export function BUIBookComponentCard({ bookId }: BUIBookComponentCardProps) {
  const [book, setBook] = useState<BUIBookEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Controlled visibility state for the rich-text content layout
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    async function fetchBookDetails() {
      try {
        // Leverages query.getOne method from bui.book.module.ts
        const book = await buiBookModule.query.getOne(bookId);
        if (book) {
          setBook(book);
        }
      } catch (error) {
        console.error("Failed to load parent book context:", error);
      } finally {
        setLoading(false);
      }
    }

    if (bookId) {
      fetchBookDetails();
    }
  }, [bookId]);

  if (loading) {
    return (
      <Card className="w-full border border-default-200 shadow-sm rounded-xl">
        <div className="h-[140px] w-full animate-pulse bg-default-100 rounded-xl" />
      </Card>
    );
  }

  if (!book) {
    return (
      <div className="p-4 text-sm text-danger bg-danger-50 rounded-xl border border-danger-200">
        Parent book information could not be found.
      </div>
    );
  }

  return (
    <Card className="w-full border border-default-200 shadow-sm rounded-xl bg-background">
      <Card.Header className="flex flex-col items-start px-6 pt-5 pb-2 gap-0.5">
        {/* Core Back Link navigation matching the crimson branding matrix */}
        <Link 
          href="/modules/bunny-ai/books" 
          className="flex items-center gap-1.5 text-xs font-semibold text-[#ff2d20] hover:text-red-600 transition-colors mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Books
        </Link>
        
        <span className="text-xs font-semibold uppercase tracking-wider text-default-400">
          Chapter Workspace For
        </span>
        <Card.Title className="text-2xl font-bold text-foreground tracking-tight">
          {book.title}
        </Card.Title>
      </Card.Header>
      
      <Separator />
      
      <Card.Content className="px-6 py-4 flex flex-col gap-1.5">
        {/* Stateful HeroUI compound Disclosure component wrapper */}
        <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded} className="w-full">
          <Disclosure.Heading>
            <Disclosure.Trigger className="flex items-center justify-between w-full text-xs font-medium text-default-400 uppercase tracking-wider py-1 hover:text-default-600 transition-colors cursor-pointer">
              <span>Book Description</span>
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          
          <Disclosure.Content className="pt-2">
            {/* Render HTML markup output safely from the description editor */}
            <div 
              className="text-sm text-default-700 prose dark:prose-invert max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: book.description || "<em>No description provided.</em>" }}
            />
          </Disclosure.Content>
        </Disclosure>
      </Card.Content>
    </Card>
  );
}