import { join } from 'node:path';
import { Image, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';

export async function renderPdf(element: ReactElement<DocumentProps>): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(element));
}

export const pdf = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.45 },
  muted: { color: '#666666' },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 20, marginBottom: 8 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#cccccc', paddingVertical: 4 },
  cell: { flex: 1 },
  right: { flex: 1, textAlign: 'right' },
  total: { flexDirection: 'row', paddingVertical: 4, fontFamily: 'Helvetica-Bold' },
  banner: { backgroundColor: '#fff3cd', padding: 8, marginBottom: 12, fontFamily: 'Helvetica-Bold' },
});

const LOGO = join(process.cwd(), 'public/brand/logo.png');

export function Letterhead({ title, number, date }: { title: string; number?: string | null; date: Date }) {
  return (
    <View>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
      <Image src={LOGO} style={{ width: 110, marginBottom: 4 }} />
      <Text style={pdf.muted}>Property and vehicle marketing</Text>
      <Text style={pdf.h1}>{title}</Text>
      {number ? <Text>No. {number}</Text> : null}
      <Text>Date: {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
    </View>
  );
}
