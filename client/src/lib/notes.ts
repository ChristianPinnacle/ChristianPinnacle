export const VALID_FOLDERS = [
  "projects",
  "areas",
  "resources",
  "warroom",
  "archive",
  "unsorted",
] as const;

export type NoteFolder = (typeof VALID_FOLDERS)[number];

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTagsInput(tags: string[]): string {
  return tags.join(", ");
}

export function renderMarkdownPreview(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n").map((line) => {
        if (line.startsWith("### ")) {
          return `<h3>${inlineMarkdown(line.slice(4))}</h3>`;
        }
        if (line.startsWith("## ")) {
          return `<h2>${inlineMarkdown(line.slice(3))}</h2>`;
        }
        if (line.startsWith("# ")) {
          return `<h1>${inlineMarkdown(line.slice(2))}</h1>`;
        }
        if (line.startsWith("- ")) {
          return `<li>${inlineMarkdown(line.slice(2))}</li>`;
        }
        return `<p>${inlineMarkdown(line)}</p>`;
      });

      const listItems = lines.filter((line) => line.startsWith("<li>"));
      if (listItems.length === lines.length && listItems.length > 0) {
        return `<ul>${listItems.join("")}</ul>`;
      }

      return lines.join("");
    })
    .join("");
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '<span class="wikilink">[[$1]]</span>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
