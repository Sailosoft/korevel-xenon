Depending on your exact use case, "template building and string builder" usually means one of two things: either you are looking for a **Template Engine** (to generate HTML/text dynamically with data), or you want a literal **String Builder Utility Class** (similar to Java's `StringBuilder` or C#'s `StringBuilder`) to cleanly chain together strings.

The best packages and options for TypeScript are categorized below based on what you need.

---

## 1. For Template Building (Template Engines)

If you need to inject data into structural text templates, logic-based layouts, or code generation formats, these are the industry standards:

### **Handlebars.js** (`handlebars`)

Handlebars is arguably the most popular and reliable logic-strapped template engine for JavaScript and TypeScript. It uses double curly braces `{{ variable }}` to compile reusable templates.

- **Best for:** Email generation, HTML layouts, and text formatting.
- **Installation:** `npm i handlebars` (types are built-in or via `npm i -D @types/handlebars`)

```typescript
import Handlebars from "handlebars";

const source = "Hello {{name}}, you have {{count}} unread messages.";
const template = Handlebars.compile(source);

const result = template({ name: "Alice", count: 5 });
// Output: Hello Alice, you have 5 unread messages.
```

### **Eta** (`eta`)

Eta is a modern, lightweight, and ultra-fast template engine written directly in TypeScript. It allows you to write raw JavaScript/TypeScript loops and conditionals straight inside your templates.

- **Best for:** High-performance template rendering, native TypeScript support.
- **Installation:** `npm i eta`

```typescript
import { Eta } from "eta";

const eta = new Eta();
const template =
  "Hi <%= it.name %>, <% if (it.isAdmin) { %>Welcome Admin!<% } %>";

const result = eta.renderString(template, { name: "Bob", isAdmin: true });
// Output: Hi Bob, Welcome Admin!
```

---

## 2. For Fluent String Building (Method Chaining)

If you want to construct a long string step-by-step using a **fluent interface** (e.g., `.append().appendLine().toString()`), you don't always need a heavy package.

### Option A: Use a Dedicated Package (`string-builder`)

There are micro-packages that mimic the C# / Java string builder API perfectly.

- **Installation:** `npm i string-builder` (or `stringbuilder`)

```typescript
import StringBuilder from "string-builder";

const sb = new StringBuilder();
sb.append("Starting text...")
  .appendLine()
  .appendFormat("Hello, {0}! You are user #{1}.", "Charlie", 101)
  .appendLine("Goodbye!");

console.log(sb.toString());
```

### Option B: Built-in Vanilla TypeScript (Array Join)

In modern JavaScript/TypeScript, an array acts as an highly-optimized, native string builder. You don't actually need an external dependency for performance anymore, as arrays handle sequential pushes elegantly:

```typescript
class TypeScriptStringBuilder {
  private lines: string[] = [];

  append(text: string): this {
    this.lines.push(text);
    return this;
  }

  appendLine(text: string = ""): this {
    this.lines.push(text + "\n");
    return this;
  }

  build(): string {
    return this.lines.join("");
  }
}

// Usage:
const doc = new TypeScriptStringBuilder()
  .appendLine("# Document Title")
  .append("Author: ")
  .appendLine("Dev")
  .build();
```

---

## 3. The "Hybrid" Option (Tagged Templates)

If you want to build complex, safe strings natively using TypeScript without string concatenation bugs, look into **Tagged Template Literals**. For example, if you are building SQL strings, packages like `sql-template-strings` or `ts-writer` allow you to intercept template strings safely:

```typescript
// Built-in TS feature
function customTag(strings: TemplateStringsArray, ...values: any[]) {
  // You can manipulate chunks of templates and variables here
  return strings.reduce((acc, str, i) => acc + str + (values[i] || ""), "");
}

const item = "Widget";
const query = customTag`SELECT * FROM products WHERE name = ${item}`;
```

Which exact structure are you attempting to generate (e.g., HTML emails, dynamic SQL queries, markdown documents, or source code)? Sharing a quick mock-up of your end goal can help determine the best path.
