/**
 * Extract plain text from a bracket PDF (for manual mapping into JSON).
 *
 * Usage: npx tsx scripts/extract-pdf-text.ts path/to/file.pdf [output.txt]
 *
 * If output path is omitted, prints to stdout.
 */
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const pdfParse = (await import("pdf-parse")).default as (
    data: Buffer,
  ) => Promise<{ text: string }>;

  const input = process.argv[2];
  const out = process.argv[3];
  if (!input) {
    console.error("Usage: npx tsx scripts/extract-pdf-text.ts <file.pdf> [out.txt]");
    process.exit(1);
  }
  const buf = fs.readFileSync(path.resolve(input));
  const { text } = await pdfParse(buf);
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (out) {
    fs.writeFileSync(path.resolve(out), normalized + "\n", "utf8");
    console.error("Wrote", path.resolve(out));
  } else {
    process.stdout.write(normalized + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
