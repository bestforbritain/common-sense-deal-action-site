/**
 * Renders a posted letter as an A4 PDF. Server-only.
 *
 * The PDF the sender previews is the PDF that gets posted: rendering is deterministic
 * (fixed metadata, built-in Helvetica), and the submit route checks the hash of the
 * re-rendered PDF against the one the sender previewed.
 */
import { createHash } from "node:crypto";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { letterFooter } from "@/content/postedLetter";
import { LAYOUT, MAX_LETTER_CHARACTERS, MM } from "./layout";

const styles = StyleSheet.create({
  page: {
    paddingTop: LAYOUT.topClearMm * MM,
    paddingLeft: LAYOUT.sideMarginMm * MM,
    paddingRight: LAYOUT.sideMarginMm * MM,
    paddingBottom: LAYOUT.bottomMarginMm * MM,
    fontFamily: "Helvetica",
    fontSize: LAYOUT.fontSizePt,
    lineHeight: LAYOUT.lineHeight,
    color: "#000000",
  },
  paragraph: { marginBottom: LAYOUT.paragraphGapPt },
  footer: {
    position: "absolute",
    bottom: 9 * MM,
    left: LAYOUT.sideMarginMm * MM,
    right: LAYOUT.sideMarginMm * MM,
    fontSize: 8,
    color: "#555555",
  },
});

function LetterDocument({ text }: { text: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Document
      title="Letter"
      author="Best for Britain"
      creator="Common Sense Deal"
      producer="Common Sense Deal"
      creationDate={LAYOUT.fixedDate}
      modificationDate={LAYOUT.fixedDate}
    >
      <Page size={LAYOUT.pageSize} style={styles.page}>
        <View>
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
        {letterFooter.enabled && (
          <Text style={styles.footer} fixed>
            {letterFooter.text}
          </Text>
        )}
      </Page>
    </Document>
  );
}

/** Counts page objects in a PDF (not the /Pages tree node). */
export function countPdfPages(pdf: Uint8Array): number {
  const text = Buffer.from(pdf).toString("latin1");
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

export type RenderedLetter =
  | { ok: true; pdf: Uint8Array; sha256: string; pages: 1 }
  | { ok: false; reason: "too-long" | "empty"; pages?: number };

export async function renderLetterPdf(text: string): Promise<RenderedLetter> {
  if (!text.trim()) return { ok: false, reason: "empty" };
  if (text.length > MAX_LETTER_CHARACTERS) return { ok: false, reason: "too-long" };
  const pdf = new Uint8Array(await renderToBuffer(<LetterDocument text={text} />));
  const pages = countPdfPages(pdf);
  if (pages !== 1) return { ok: false, reason: "too-long", pages };
  return { ok: true, pdf, sha256: createHash("sha256").update(pdf).digest("hex"), pages: 1 };
}
