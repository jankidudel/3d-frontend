import type { jsPDF as JsPdfConstructor, jsPDFOptions } from 'jspdf';

export type JsPdf = InstanceType<typeof JsPdfConstructor>;

export async function createPdf(options?: jsPDFOptions): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  return new jsPDF(options);
}
