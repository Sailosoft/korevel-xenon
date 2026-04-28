"use client";
import ElvenDrawer from "./components/elven.drawer";
import ElvenHeader from "./components/elven.header";
import { ElvenProvider } from "./elven.context";
import ElvenAuthor from "./features/authors/elven-author";
export default function Elven() {
  return (
    <div className="m-4">
      <ElvenProvider>
        <ElvenHeader />
        <ElvenDrawer />
        <ElvenAuthor />
      </ElvenProvider>
    </div>
  );
}
