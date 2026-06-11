"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { buiDatabase } from "@/src/modules/bunny-ai/src/database/bui.database";
import { BUIAuthor } from "@/src/modules/bunny-ai/src/modules/authors/bui.author.entity";
import { BUIBookEntity } from "@/src/modules/bunny-ai/src/modules/books/bui.book.entity";
import { BUIAuthorSkill } from "@/src/modules/bunny-ai/src/modules/author-skills/bui.author-skills.entity";
import BUIAuthorSkillRelationRepository from "@/src/modules/bunny-ai/src/modules/author-skills/bui.author-skills.relation.repository";
import {
  Users,
  BookOpen,
  Zap,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  Library,
  Sparkles,
  Layers,
  UserCircle,
  Rabbit,
  BookOpenCheck,
} from "lucide-react";

// ─── Theme — matches the layout's Laravel crimson ───
const THEME = {
  gradient: "from-[#ff2d20] to-[#f43f5e]",
  shadow: "shadow-red-100",
  textPrimary: "text-[#ff2d20]",
  btnPrimary: "bg-[#ff2d20] text-white hover:bg-[#e0241b] transition-colors",
  btnSecondary: "text-[#ff2d20] bg-red-50 hover:bg-red-100 transition-colors",
  border: "border-slate-100",
};

// ─── Helpers ───
function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ─── Stat Card ───
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  accent: string;
  trend?: string;
}

function StatCard({ label, value, icon, href, accent, trend }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`group relative bg-white rounded-2xl border ${THEME.border} p-5 md:p-6 
        hover:shadow-lg hover:border-red-100 transition-all duration-200 
        hover:-translate-y-0.5 cursor-pointer flex flex-col gap-3`}
    >
      {/* Icon circle */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}
      >
        {icon}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <ArrowRight
          className={`w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:${THEME.textPrimary} transition-all`}
        />
      </div>
    </Link>
  );
}

// ─── Recent Book Row ───
function RecentBookRow({
  book,
  authorName,
}: {
  book: BUIBookEntity;
  authorName: string;
}) {
  return (
    <Link
      href={`/modules/bunny-ai/books/${book.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#ff2d20] transition-colors">
          {book.title}
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
          <UserCircle className="w-3 h-3" />
          {authorName || "Unassigned"}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#ff2d20] transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Recent Author Row ───
function RecentAuthorRow({
  author,
  skillCount,
}: {
  author: BUIAuthor;
  skillCount: number;
}) {
  return (
    <Link
      href="/modules/bunny-ai/authors"
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div
        className={`w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center flex-shrink-0`}
      >
        <Users className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#ff2d20] transition-colors">
          {author.name}
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
          <Zap className="w-3 h-3" />
          {skillCount} {pluralize(skillCount, "skill")}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#ff2d20] transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Quick Action Tile ───
interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accent: string;
}

function QuickAction({
  label,
  description,
  icon,
  href,
  accent,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-4 rounded-xl border ${THEME.border} bg-white 
        hover:shadow-md hover:border-red-100 transition-all duration-200 cursor-pointer`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-[#ff2d20] transition-colors">
          {label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#ff2d20] group-hover:rotate-90 transition-all flex-shrink-0" />
    </Link>
  );
}

// ─── Section Header ───
function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      <Link
        href={href}
        className={`text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors flex items-center gap-1`}
      >
        View All
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════
export default function BUIDashboard() {
  // ── Reactive Dexie queries ──
  const authors = useLiveQuery(() => buiDatabase.authors.toArray()) ?? [];
  const books = useLiveQuery(() => buiDatabase.books.toArray()) ?? [];
  const chapters = useLiveQuery(() => buiDatabase.chapters.toArray()) ?? [];
  const skills = useLiveQuery(() => buiDatabase.authorSkills.toArray()) ?? [];
  const relations =
    useLiveQuery(() => buiDatabase.authorSkillRelations.toArray()) ?? [];

  // ── Derived stats ──
  const authorsWithBooks = useMemo(
    () => new Set(books.map((b) => b.authorId).filter(Boolean)),
    [books],
  );

  const totalChapters = chapters.length;
  const totalChaptersDone = chapters.filter((c) => c.status === "done").length;

  // Book-author map for quick lookup
  const authorMap = useMemo(() => {
    const map = new Map<number, BUIAuthor>();
    authors.forEach((a) => {
      if (a.id != null) map.set(a.id, a);
    });
    return map;
  }, [authors]);

  // ── Recent books (last 5) sorted by id desc ──
  const recentBooks = useMemo(
    () =>
      [...books]
        .filter((b) => b.id != null)
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
        .slice(0, 5),
    [books],
  );

  // ── Recent authors (last 5) sorted by id desc ──
  const recentAuthors = useMemo(
    () =>
      [...authors]
        .filter((a) => a.id != null)
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
        .slice(0, 5),
    [authors],
  );

  // ── Skill counts per author ──
  const skillCountByAuthor = useMemo(() => {
    const map = new Map<number, number>();
    relations.forEach((r) => {
      if (r.authorId != null) {
        map.set(r.authorId, (map.get(r.authorId) ?? 0) + 1);
      }
    });
    return map;
  }, [relations]);

  // ── Top-skilled authors ──
  const topSkilledAuthors = useMemo(
    () =>
      [...skillCountByAuthor.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([authorId, count]) => ({
          author: authorMap.get(authorId),
          count,
        }))
        .filter((entry) => entry.author != null),
    [skillCountByAuthor, authorMap],
  );

  // ── Skill usage (authors per skill) ──
  const skillUsage = useMemo(() => {
    const map = new Map<number, number>();
    relations.forEach((r) => {
      if (r.skillId != null) {
        map.set(r.skillId, (map.get(r.skillId) ?? 0) + 1);
      }
    });
    return map;
  }, [relations]);

  const topSkills = useMemo(
    () =>
      [...skillUsage.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skillId, count]) => ({
          skill: skills.find((s) => s.id === skillId),
          count,
        }))
        .filter((entry) => entry.skill != null),
    [skillUsage, skills],
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <span
              className={`w-10 h-10 bg-gradient-to-br ${THEME.gradient} rounded-xl flex items-center justify-center shadow-lg ${THEME.shadow}`}
            >
              <Rabbit className="w-5 h-5 text-white" />
            </span>
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-[3.25rem]">
            Overview of your Bunny AI book-building workspace
          </p>
        </div>

        <Link
          href="/modules/bunny-ai/books"
          className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold ${THEME.btnPrimary} shadow-md ${THEME.shadow}`}
        >
          <Plus className="w-4 h-4" />
          New Book
        </Link>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Authors"
          value={authors.length}
          icon={<Users className="w-5 h-5 text-white" />}
          href="/modules/bunny-ai/authors"
          accent="bg-gradient-to-br from-violet-400 to-purple-500"
        />
        <StatCard
          label="Books"
          value={books.length}
          icon={<BookOpen className="w-5 h-5 text-white" />}
          href="/modules/bunny-ai/books"
          accent="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <StatCard
          label="Chapters"
          value={totalChapters}
          icon={<FileText className="w-5 h-5 text-white" />}
          href="/modules/bunny-ai/books"
          accent="bg-gradient-to-br from-emerald-400 to-teal-500"
          trend={
            totalChapters > 0
              ? `${Math.round((totalChaptersDone / totalChapters) * 100)}% done`
              : undefined
          }
        />
        <StatCard
          label="Skills"
          value={skills.length}
          icon={<Zap className="w-5 h-5 text-white" />}
          href="/modules/bunny-ai/author-skills"
          accent="bg-gradient-to-br from-rose-400 to-pink-500"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Recent Books ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<BookOpenCheck className="w-5 h-5" />}
            title="Recent Books"
            href="/modules/bunny-ai/books"
          />

          {recentBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Library className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No books yet</p>
              <Link
                href="/modules/bunny-ai/books"
                className={`mt-3 text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors`}
              >
                Create your first book &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentBooks.map((book) => (
                <RecentBookRow
                  key={book.id}
                  book={book}
                  authorName={
                    book.authorId != null
                      ? (authorMap.get(book.authorId)?.name ?? "Unknown")
                      : "Unassigned"
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Authors ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<Users className="w-5 h-5" />}
            title="Recent Authors"
            href="/modules/bunny-ai/authors"
          />

          {recentAuthors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">
                No authors yet
              </p>
              <Link
                href="/modules/bunny-ai/authors"
                className={`mt-3 text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors`}
              >
                Add your first author &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentAuthors.map((author) => (
                <RecentAuthorRow
                  key={author.id}
                  author={author}
                  skillCount={skillCountByAuthor.get(author.id ?? -1) ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Insights Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Top Skilled Authors ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<Sparkles className="w-5 h-5" />}
            title="Most Skilled Authors"
            href="/modules/bunny-ai/authors"
          />

          {topSkilledAuthors.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No skills have been assigned to authors yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topSkilledAuthors.map(({ author, count }, i) => (
                <div
                  key={author!.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {author!.name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                    {count} {pluralize(count, "skill")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Most Used Skills ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<Layers className="w-5 h-5" />}
            title="Top Skills"
            href="/modules/bunny-ai/author-skills"
          />

          {topSkills.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No skills have been created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topSkills.map(({ skill, count }, i) => (
                <div
                  key={skill!.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {skill!.name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-violet-500 bg-violet-50 px-2.5 py-1 rounded-full">
                    {count} {pluralize(count, "author")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            label="New Author"
            description="Add an author profile to your workspace"
            icon={<Users className="w-5 h-5 text-white" />}
            href="/modules/bunny-ai/authors"
            accent="bg-gradient-to-br from-violet-400 to-purple-500"
          />
          <QuickAction
            label="New Book"
            description="Start writing a new book project"
            icon={<BookOpen className="w-5 h-5 text-white" />}
            href="/modules/bunny-ai/books"
            accent="bg-gradient-to-br from-amber-400 to-orange-500"
          />
          <QuickAction
            label="New Skill"
            description="Define a skill authors can possess"
            icon={<Zap className="w-5 h-5 text-white" />}
            href="/modules/bunny-ai/author-skills"
            accent="bg-gradient-to-br from-rose-400 to-pink-500"
          />
        </div>
      </div>

      {/* ── Completion summary ── */}
      <div
        className={`bg-gradient-to-br ${THEME.gradient} rounded-2xl p-6 md:p-8 text-white shadow-lg ${THEME.shadow}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Rabbit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Workspace Summary</h3>
              <p className="text-sm text-white/80">
                {authors.length} {pluralize(authors.length, "author")} &middot;{" "}
                {books.length} {pluralize(books.length, "book")} &middot;{" "}
                {totalChapters} {pluralize(totalChapters, "chapter")} &middot;{" "}
                {skills.length} {pluralize(skills.length, "skill")}
              </p>
            </div>
          </div>
          <Link
            href="/modules/bunny-ai/books"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-sm font-semibold transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Browse Books
          </Link>
        </div>
      </div>
    </div>
  );
}
