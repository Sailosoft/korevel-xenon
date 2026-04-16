import BookBuilderModule from "@/src/modules/book-builder/src/book-builder.module";

export default async function BookBuilderPage() {
  // const Datastore = require("@seald-io/nedb");
  // console.log(Datastore);
  const builder = new BookBuilderModule();
  const response = await builder.generateBook();
  return <div>Book Builder {response.output_text}</div>;
}
