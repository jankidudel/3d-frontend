import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { strToU8, zipSync } from 'fflate';
import { ThreeMfToStlConverterPage } from './local-converter-page';
import { ThreeMfViewerPage } from '../three-mf/threemf-viewer-page';
const bytes = zipSync({
  '_rels/.rels': strToU8(
    '<Relationships><Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/Models/main.model"/></Relationships>',
  ),
  'Models/main.model': strToU8(
    '<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" name="&lt;script&gt;untrusted&lt;/script&gt;"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="20" y="0" z="0"/><vertex x="0" y="20" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>',
  ),
});
function source(
  name: string,
  promise: Promise<ArrayBuffer> = Promise.resolve(bytes.slice().buffer),
): File {
  const file = new File(['source'], name);
  Object.defineProperty(file, 'arrayBuffer', { value: () => promise });
  return file;
}
function deferred<T>() {
  let resolve!: (result: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
describe('3MF asynchronous source and scope ownership', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }),
  );
  it('loading B supersedes late A in converter and viewer', async () => {
    for (const component of [ThreeMfToStlConverterPage, ThreeMfViewerPage]) {
      const a = deferred<ArrayBuffer>();
      const fixture = TestBed.createComponent<
        ThreeMfToStlConverterPage | ThreeMfViewerPage
      >(component);
      const instance = fixture.componentInstance;
      const pending = instance.loadPublicExample([source('A.3mf', a.promise)]);
      await instance.loadPublicExample([source('B.3mf')]);
      a.resolve(bytes.slice().buffer);
      await pending;
      if (instance instanceof ThreeMfToStlConverterPage) {
        expect(instance.file()?.name).toBe('B.3mf');
        expect(instance.resolved()?.items[0].id).toBe('build-1');
        expect(instance.report()).toBeNull();
      } else {
        expect(instance.model()?.name).toBe('B.3mf');
        expect(instance.selectedItem()).toBeNull();
      }
      fixture.destroy();
    }
  });
  it('copy and JSON download carry the same complete report, with a clipboard fallback', async () => {
    const fixture = TestBed.createComponent(ThreeMfToStlConverterPage);
    const instance = fixture.componentInstance;
    await instance.loadPublicExample([source('model.3mf')]);
    await instance.convert();
    const expected = instance.reportText();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const download = vi
      .spyOn(
        instance as unknown as {
          download: (bytes: Uint8Array, name: string, type: string) => void;
        },
        'download',
      )
      .mockImplementation(() => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      await instance.copyReport();
      expect(writeText).toHaveBeenCalledWith(expected);
      expect(instance.status()).toBe('Export report copied.');
      instance.downloadReport();
      expect(new TextDecoder().decode(download.mock.calls[0][0])).toBe(
        expected,
      );
      expect(
        JSON.parse(expected).placedItems[0].originalPlacement,
      ).toHaveLength(16);
      writeText.mockRejectedValue(new Error('clipboard unavailable'));
      await instance.copyReport();
      expect(instance.status()).toBe(
        'Clipboard unavailable. Download the JSON report instead.',
      );
    } finally {
      vi.unstubAllGlobals();
      fixture.destroy();
    }
  });
  it('scope changes suppress an in-flight derivative and render file labels as text', async () => {
    const fixture = TestBed.createComponent(ThreeMfToStlConverterPage);
    const instance = fixture.componentInstance;
    await instance.loadPublicExample([source('model.3mf')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('script')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain(
      '<script>untrusted</script>',
    );
    const converting = instance.convert();
    instance.changeScope({ target: { value: 'build-1' } } as unknown as Event);
    await converting;
    expect(instance.report()).toBeNull();
    expect(instance.result()).toBeNull();
    expect(instance.converting()).toBe(false);
  });
});
