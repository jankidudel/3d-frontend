import { TestBed } from '@angular/core/testing';
import { CookiesPage } from './cookies-page';

describe('CookiesPage', () => {
  it('uses Google Analytics without GA4 branding in public copy', () => {
    TestBed.configureTestingModule({ imports: [CookiesPage] });
    const fixture = TestBed.createComponent(CookiesPage);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Google Analytics');
    expect(text).not.toContain('Google Analytics 4');
    expect(text).not.toContain('GA4');
  });
});
