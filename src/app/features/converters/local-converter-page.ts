import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { strToU8, zipSync } from 'fflate';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';

type ConverterKind = 'stl-to-3mf' | '3mf-to-stl';
type OutputUnit = 'millimeter' | 'centimeter' | 'meter' | 'inch';

interface ConversionResult {
  readonly dimensions?: readonly [number, number, number];
  readonly sourceUnit?: string;
  readonly triangles: number;
  readonly unit?: OutputUnit;
}

const UNIT_LABELS: Readonly<Record<OutputUnit, string>> = {
  millimeter: 'Millimetres',
  centimeter: 'Centimetres',
  meter: 'Metres',
  inch: 'Inches',
};

@Component({
  selector: 'app-local-converter-page',
  imports: [RouterLink],
  templateUrl: './local-converter-page.html',
  styleUrl: './local-converter-page.scss',
})
export class LocalConverterPage {
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly routeUrl = PublicRouteUrl;
  readonly file = signal<File | null>(null);
  readonly status = signal('');
  readonly error = signal('');
  readonly result = signal<ConversionResult | null>(null);
  readonly converting = signal(false);
  readonly outputUnit = signal<OutputUnit>('millimeter');
  readonly outputUnits: readonly OutputUnit[] = [
    'millimeter',
    'centimeter',
    'meter',
    'inch',
  ];
  protected kind: ConverterKind = 'stl-to-3mf';
  protected title = 'STL to 3MF Converter';
  protected eyebrow = 'Browser-local conversion';
  protected guideUrl: string = PublicRouteUrl.StlToThreeMfGuide;
  protected viewerUrl = PublicRouteUrl.ThreeMfViewer;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly seo = inject(SeoService);
  private run = 0;

  constructor() {
    this.applySeo();
  }

  openPicker(): void {
    this.picker()?.nativeElement.click();
  }

  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.select(input.files?.item(0) ?? null);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.select(event.dataTransfer?.files.item(0) ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  setUnit(event: Event): void {
    this.outputUnit.set(
      (event.target as HTMLSelectElement).value as OutputUnit,
    );
  }

  async convert(): Promise<void> {
    const file = this.file();
    if (!file || this.converting() || !this.browser) {
      return;
    }
    const run = ++this.run;
    this.converting.set(true);
    this.error.set('');
    this.result.set(null);
    this.status.set('Reading the file locally…');
    try {
      const converted =
        this.kind === 'stl-to-3mf'
          ? await this.stlToThreeMf(file, this.outputUnit())
          : await this.threeMfToStl(file);
      if (run !== this.run) {
        return;
      }
      this.status.set('Preparing your download…');
      this.download(converted.bytes, converted.name, converted.type);
      this.result.set(converted.result);
      this.status.set(
        'Converted locally and downloaded. Your source file was not uploaded.',
      );
    } catch (error: unknown) {
      if (run !== this.run) {
        return;
      }
      this.status.set('');
      this.error.set(this.messageFor(error));
    } finally {
      if (run === this.run) {
        this.converting.set(false);
      }
    }
  }

  protected select(file: File | null): void {
    ++this.run;
    this.converting.set(false);
    this.file.set(null);
    this.error.set('');
    this.status.set('');
    this.result.set(null);
    if (!file) {
      return;
    }
    const extension = this.kind === 'stl-to-3mf' ? '.stl' : '.3mf';
    if (!file.name.toLowerCase().endsWith(extension)) {
      this.error.set(
        `Choose a ${extension.toUpperCase().slice(1)} file with a ${extension} extension.`,
      );
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected file is empty. Choose another file.');
      return;
    }
    if (file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        'This file is over the 25 MiB browser-safe limit. Choose a smaller file.',
      );
      return;
    }
    this.file.set(file);
  }

  private async stlToThreeMf(file: File, unit: OutputUnit) {
    this.status.set('Parsing STL geometry locally…');
    const [{ STLLoader }] = await Promise.all([
      import('three/examples/jsm/loaders/STLLoader.js'),
    ]);
    const geometry = new STLLoader().parse(await file.arrayBuffer());
    const positions = geometry.getAttribute('position');
    if (!positions || positions.count === 0 || positions.count % 3 !== 0) {
      throw new Error('invalid-stl');
    }
    await yieldToBrowser();
    this.status.set('Creating a minimal 3MF package locally…');
    const triangles = positions.count / 3;
    const vertices: string[] = [];
    const trianglesXml: string[] = [];
    for (let index = 0; index < positions.count; index += 3) {
      const vertexIndex = index;
      for (let point = 0; point < 3; point++) {
        vertices.push(
          `<vertex x="${number(positions.getX(index + point))}" y="${number(positions.getY(index + point))}" z="${number(positions.getZ(index + point))}"/>`,
        );
      }
      trianglesXml.push(
        `<triangle v1="${vertexIndex}" v2="${vertexIndex + 1}" v3="${vertexIndex + 2}"/>`,
      );
      if (index > 0 && index % 30000 === 0) {
        await yieldToBrowser();
      }
    }
    const model = `<?xml version="1.0" encoding="UTF-8"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="${unit}" xml:lang="en-US"><resources><object id="1" type="model"><mesh><vertices>${vertices.join('')}</vertices><triangles>${trianglesXml.join('')}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
    const bytes = zipSync({
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
      ),
      '3D/3dmodel.model': strToU8(model),
    });
    return {
      bytes,
      name: outputName(file.name, '.3mf'),
      type: 'model/3mf',
      result: { triangles, unit } satisfies ConversionResult,
    };
  }

  private async threeMfToStl(file: File) {
    this.status.set('Resolving 3MF build geometry locally…');
    const { convertThreeMfToStl } = await import('./three-mf-stl-export');
    const converted = await convertThreeMfToStl(await file.arrayBuffer());
    return {
      ...converted,
      name: outputName(file.name, '.stl'),
      type: 'model/stl',
    };
  }

  private download(bytes: Uint8Array, name: string, type: string): void {
    const url = URL.createObjectURL(
      new Blob([bytes.slice().buffer as ArrayBuffer], { type }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private messageFor(error: unknown): string {
    if (error instanceof Error && error.message === 'invalid-stl') {
      return 'We could not read valid triangle geometry from that STL file.';
    }
    if (error instanceof Error && error.message === 'empty-3mf') {
      return 'This 3MF has no resolved build geometry to export.';
    }
    return this.kind === 'stl-to-3mf'
      ? 'We could not convert that STL. Choose a valid ASCII or binary STL file and try again.'
      : 'We could not resolve that 3MF. Choose a standard, unencrypted 3MF with supported mesh geometry and try again.';
  }

  protected unitLabel(unit: OutputUnit): string {
    return UNIT_LABELS[unit];
  }
  protected format(value: number): string {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(
      value,
    );
  }
  protected applySeo(): void {
    this.seo.apply({
      title: `${this.title} - Convert Locally | InspectMesh`,
      description:
        this.kind === 'stl-to-3mf'
          ? 'Convert STL files to basic 3MF packages locally in your browser, with no upload.'
          : 'Export resolved 3MF geometry as one binary STL locally in your browser, with no upload.',
      path:
        this.kind === 'stl-to-3mf'
          ? PublicRouteUrl.StlToThreeMfConverter
          : PublicRouteUrl.ThreeMfToStlConverter,
    });
  }
}

@Component({
  selector: 'app-stl-to-three-mf-converter-page',
  imports: [RouterLink],
  templateUrl: './local-converter-page.html',
  styleUrl: './local-converter-page.scss',
})
export class StlToThreeMfConverterPage extends LocalConverterPage {}

@Component({
  selector: 'app-three-mf-to-stl-converter-page',
  imports: [RouterLink],
  templateUrl: './local-converter-page.html',
  styleUrl: './local-converter-page.scss',
})
export class ThreeMfToStlConverterPage extends LocalConverterPage {
  protected override kind: ConverterKind = '3mf-to-stl';
  protected override title = '3MF to STL Converter';
  protected override guideUrl = PublicRouteUrl.ThreeMfToStlGuide;
  protected override viewerUrl = PublicRouteUrl.ThreeMfViewer;
  constructor() {
    super();
    this.applySeo();
  }
}

function outputName(name: string, extension: string): string {
  return `${
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'model'
  }${extension}`;
}
function number(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve));
}
