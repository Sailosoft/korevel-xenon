"use client";

import Markdown from "react-markdown";
import React, { useEffect, useState } from "react";
import { Card, Separator, Disclosure } from "@heroui/react";
import { BUIBookEntity } from "./bui.book.entity";
import { BUIBookRepository } from "./bui.book.repository";
import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";

interface BUIBookComponentCardProps {
  bookId: number;
}

export function BUIBookComponentCard({ bookId }: BUIBookComponentCardProps) {
  const [book, setBook] = useState<BUIBookEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    async function fetchBookDetails() {
      try {
        const repo = new BUIBookRepository();
        const authorRepo = new BUIAuthorRepository();
        const data = await repo.panelGetOne(bookId);
        if (data) {
          console.log(data);
          console.log("Author ID:", data.authorId);
          const author = await authorRepo.get(data.authorId as AdminPanelId);
          console.log(author);
          if (author.isSuccess) {
            setBook({ ...data, author: author.value });
          } else {
            setBook(data);
          }
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

      <Card.Content className="px-6 py-4 flex flex-col gap-4">
        <Disclosure
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          className="w-full"
        >
          <Disclosure.Heading>
            <Disclosure.Trigger className="flex items-center justify-between w-full text-xs font-medium text-default-400 uppercase tracking-wider py-1 hover:text-default-600 transition-colors cursor-pointer">
              <span>Book Description & Author Context</span>
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>

          <Disclosure.Content className="pt-3 flex flex-col gap-4">
            {/* Author Profile Information Area Display Block — Placed first */}
            <div className="p-3 bg-default-50 border border-default-200 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500 uppercase tracking-wider">
                <UserCircle className="w-4 h-4 text-default-400" />
                <span>Author Information Profile</span>
              </div>
              <div className="pl-5 flex flex-col gap-0.5">
                <span className="text-sm font-bold text-default-800">
                  {book.author?.name || "Anonymous / Unassigned Writer"}
                </span>
                <div className="text-xs text-default-500 italic leading-relaxed prose dark:prose-invert max-w-none">
                  <Markdown>
                    {book.author?.description ||
                      "No biography details assigned to this creator profile matrix."}
                  </Markdown>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-default-400 tracking-wide">
                Book Description
              </span>
              <div className="text-sm text-default-700 prose dark:prose-invert max-w-none leading-relaxed">
                <Markdown>
                  {book.description || "*No description provided.*"}
                </Markdown>
              </div>
            </div>
          </Disclosure.Content>
        </Disclosure>
      </Card.Content>
    </Card>
  );
}
