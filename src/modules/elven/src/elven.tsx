"use client";
import ElvenDrawer from "./components/elven.drawer";
import ElvenHeader from "./components/elven.header";
import { ElvenStack } from "./components/elven.stack";
import { ElvenProvider } from "./elven.context";
import ElvenAuthor from "./features/authors/elven-author";
import ElvenBookGenerator from "./features/books/elven-book.generator";
export default function Elven() {
  return (
    <div className="m-4">
      <ElvenProvider>
        <ElvenStack direction="column" gap={2} alignItems="stretch">
          <ElvenHeader />
          <ElvenBookGenerator />
        </ElvenStack>
        <ElvenDrawer />
        <ElvenAuthor />
      </ElvenProvider>
    </div>
  );
}
