import { createPdf, type JsPdf } from '../../shared/pdf-engine';
import {
  DeliveryMode,
  formatQuoteMoney,
  type CustomerQuotation,
} from './quotation';

export interface QuoteFonts {
  regular: string;
  bold: string;
}
async function fontBase64(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('The quotation font could not load. Please try again.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
export async function createQuotationPdf(
  document: CustomerQuotation,
  fonts?: QuoteFonts,
): Promise<JsPdf> {
  const pdf = await createPdf({
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });
  const loaded = fonts ?? {
    regular: await fontBase64('/fonts/quotation/LiberationSans-Regular.ttf'),
    bold: await fontBase64('/fonts/quotation/LiberationSans-Bold.ttf'),
  };
  pdf.addFileToVFS('Quotation-Regular.ttf', loaded.regular);
  pdf.addFont('Quotation-Regular.ttf', 'Quotation', 'normal');
  pdf.addFileToVFS('Quotation-Bold.ttf', loaded.bold);
  pdf.addFont('Quotation-Bold.ttf', 'Quotation', 'bold');
  pdf.setFont('Quotation', 'normal');
  const metadata = pdf.getFont().metadata as unknown as {
    characterToGlyph(code: number): number;
  };
  const strings = Object.values(document).filter(
    (value): value is string => typeof value === 'string',
  );
  for (const text of strings) {
    for (const char of text) {
      const code = char.codePointAt(0)!;
      if (
        code > 32 &&
        (code > 65535 || metadata.characterToGlyph(code) === 0)
      ) {
        throw new Error(
          'A character in this quotation is not supported by the PDF font. Use Latin, Greek or Cyrillic text without emoji, then try again.',
        );
      }
    }
  }
  pdf.setProperties({
    title: 'Customer quotation',
    author: '',
    subject: 'Quotation, not an invoice',
    creator: 'InspectMesh',
  });
  let y = 0;
  const pageTop = (): void => {
    pdf.setTextColor(30, 54, 57);
    pdf.setFont('Quotation', 'bold');
    pdf.setFontSize(16);
    pdf.text('Customer quotation', 16, 18);
    pdf.setFontSize(9);
    pdf.setFont('Quotation', 'normal');
    pdf.text('Quotation details continued on subsequent pages', 16, 25);
    pdf.setDrawColor(190, 200, 200);
    pdf.line(16, 29, 194, 29);
    y = 38;
  };
  const nextPage = (): void => {
    pdf.addPage();
    pageTop();
  };
  const ensure = (height: number): void => {
    if (y + height > 273) {
      nextPage();
    }
  };
  const paragraph = (label: string, text: string): void => {
    if (!text.trim()) {
      return;
    }
    ensure(16);
    pdf.setFont('Quotation', 'bold');
    pdf.setFontSize(10);
    pdf.text(label, 16, y);
    y += 6;
    pdf.setFont('Quotation', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text, 178) as string[];
    let continued = false;
    for (const line of lines) {
      if (y + 5 > 273) {
        nextPage();
        pdf.setFont('Quotation', 'bold');
        pdf.text(`${label} (continued)`, 16, y);
        y += 6;
        pdf.setFont('Quotation', 'normal');
        continued = true;
      }
      pdf.text(line, 16, y);
      y += 5;
    }
    y += continued ? 5 : 4;
  };
  pageTop();
  if (document.logo) {
    const height = Math.min(
      25,
      (55 * document.logo.height) / document.logo.width,
    );
    const width = (height * document.logo.width) / document.logo.height;
    pdf.addImage(
      document.logo.dataUrl,
      document.logo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG',
      16,
      y,
      width,
      height,
    );
    y += height + 8;
  }
  if (document.fictionalExample) {
    paragraph(
      'Fictional example',
      'Invented business details and a hypothetical price. Not a market rate or a physical print test.',
    );
  }
  paragraph(
    'Business',
    [
      document.businessName,
      document.businessEmail || 'Contact email not supplied',
      document.address,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  paragraph(
    'Customer',
    [document.customerName, document.customerEmail].filter(Boolean).join('\n'),
  );
  paragraph(
    'Quotation details',
    `Reference: ${document.reference}\nIssue date: ${document.issueDate}${document.validUntil ? `\nValid until: ${document.validUntil}` : ''}\nCurrency: ${document.currency}`,
  );
  paragraph(
    'Job specification',
    `${document.jobTitle}\nQuantity: ${document.quantity} (job specification; the order charge is not multiplied again)\nMaterial: ${document.material || 'To be agreed'}\nColour: ${document.colour || 'To be agreed'}\nFinish: ${document.finish || 'To be agreed'}\nAgreed scope: ${document.agreedScope || 'To be agreed'}\nIndicative lead time: ${document.leadTime || 'To be agreed'}\nDelivery scope: ${document.deliveryScope || 'To be agreed'}`,
  );
  paragraph(
    'Model reference',
    [
      document.modelStatus,
      document.modelFilename && `Filename: ${document.modelFilename}`,
      document.revision && `Revision: ${document.revision}`,
      document.units && `Units / metadata: ${document.units}`,
      document.reviewNotes && `Review notes: ${document.reviewNotes}`,
      'Operator-entered reference. No model file is embedded or verified.',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  ensure(47);
  pdf.setFont('Quotation', 'bold');
  pdf.text('Customer charges', 16, y);
  pdf.text(`Amount (${document.currency})`, 194, y, { align: 'right' });
  y += 8;
  pdf.setFont('Quotation', 'normal');
  pdf.text('One order-level print charge', 16, y);
  pdf.text(formatQuoteMoney(document.orderCents, document.currency), 194, y, {
    align: 'right',
  });
  y += 8;
  pdf.text(
    document.deliveryMode === DeliveryMode.Included
      ? 'Delivery included in order price'
      : 'Additional delivery charge',
    16,
    y,
  );
  pdf.text(
    document.deliveryMode === DeliveryMode.Included
      ? 'Included'
      : formatQuoteMoney(document.deliveryCents, document.currency),
    194,
    y,
    { align: 'right' },
  );
  y += 10;
  pdf.setFont('Quotation', 'bold');
  pdf.text('Total quoted charges', 16, y);
  pdf.text(formatQuoteMoney(document.totalCents, document.currency), 194, y, {
    align: 'right',
  });
  y += 12;
  paragraph('Included work', document.includedWork);
  paragraph('Exclusions', document.exclusions);
  paragraph('Payment instructions', document.paymentInstructions);
  paragraph('Tax notice', document.taxNotice);
  paragraph('Customer acceptance', document.acceptanceNotice);
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page);
    pdf.setFont('Quotation', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Quotation - not an invoice | Page ${page} of ${count}`, 16, 287);
  }
  return pdf;
}
