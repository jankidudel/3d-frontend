import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SITE_CONFIG } from '../../core/site/site-config';
import { PrivacyPage } from './privacy-page';

describe('PrivacyPage', () => {
  function render(privacyContactEmail?: string) {
    TestBed.configureTestingModule({
      imports: [PrivacyPage],
      providers: [
        provideRouter([]),
        { provide: SITE_CONFIG, useValue: { privacyContactEmail } },
      ],
    });
    const fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders the configured production privacy email as a mailto link', () => {
    const fixture = render('privacy@tools.example.com');
    const link = fixture.nativeElement.querySelector(
      'a[href="mailto:privacy@tools.example.com"]',
    ) as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('privacy@tools.example.com');
  });

  it('omits contact details when the development configuration has no email', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('For privacy questions');
    expect(text).not.toContain('GitHub Issues');
    expect(
      fixture.nativeElement.querySelector('a[href^="mailto:"]'),
    ).toBeNull();
  });

  it('uses the concise Google Analytics wording and retains file handling copy', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain(
      'If you choose analytics cookies, we use Google Analytics to understand how visitors use the site and improve our tools.',
    );
    expect(text).toContain(
      'Uploaded files are processed only to provide the requested analysis and are not used for advertising or marketing.',
    );
    expect(text).not.toContain('Google Analytics 4');
    expect(text).not.toContain('GA4');
    expect(text).not.toContain('cloudfront.net');
  });
});
