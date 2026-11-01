import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { ContactService } from '../../core/api/contact.service';
import { TurnstileService } from '../../core/contact/turnstile.service';
import { SeoService } from '../../core/seo/seo.service';
import { resolveContactEmail, SITE_CONFIG } from '../../core/site/site-config';
import productionConfig from '../../../environments/site-config.production.json';
import { environment as developmentEnvironment } from '../../../environments/environment.development';
import { ContactPage } from './contact-page';

describe('ContactPage', () => {
  let fixture: ComponentFixture<ContactPage>;
  const supportEmail = resolveContactEmail(productionConfig)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        provideRouter([]),
        {
          provide: SITE_CONFIG,
          useValue: {
            contactEmail: supportEmail,
            contactCaptchaSiteKey: 'site-key',
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackContactFeedbackOpened: vi.fn(),
            trackContactFeedbackStarted: vi.fn(),
            trackContactFeedbackSubmitted: vi.fn(),
          },
        },
        { provide: SeoService, useValue: { apply: vi.fn() } },
        { provide: ContactService, useValue: { send: vi.fn() } },
        { provide: TurnstileService, useValue: { load: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('keeps the configured email out of the page until explicitly revealed', () => {
    const page = fixture.nativeElement as HTMLElement;
    fixture.componentInstance['message'].set('Draft feedback');
    fixture.detectChanges();
    const button = page.querySelector<HTMLButtonElement>('.email-reveal')!;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(page.innerHTML).not.toContain(supportEmail);
    expect(page.querySelector('a[href^="mailto:"]')).toBeNull();

    button.click();
    fixture.detectChanges();
    const link = page.querySelector<HTMLAnchorElement>(
      '#contact-support-email a',
    )!;
    expect(link.textContent).toBe(supportEmail);
    expect(link.getAttribute('href')).toBe(`mailto:${supportEmail}`);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(
      page.querySelector<HTMLTextAreaElement>('#contact-message')?.value,
    ).toBe('Draft feedback');
    expect(TestBed.inject(ContactService).send).not.toHaveBeenCalled();

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(page.innerHTML).not.toContain(supportEmail);
    expect(page.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('resolves the central address parts and preserves explicit address overrides', () => {
    expect(supportEmail).toBe(
      [
        productionConfig.contactEmailParts.localPart,
        productionConfig.contactEmailParts.domain,
      ].join('@'),
    );
    expect(resolveContactEmail({})).toBeUndefined();
    expect(
      resolveContactEmail({
        contactEmail: 'custom@example.com',
        contactEmailParts: productionConfig.contactEmailParts,
      }),
    ).toBe('custom@example.com');
  });

  it('keeps the complete form and submit button before the About section', () => {
    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    const sections = Array.from(main.querySelectorAll(':scope > section'));
    expect(
      sections.map((section) => section.getAttribute('aria-labelledby')),
    ).toEqual(['contact-form-title', 'about-inspectmesh-title']);
    expect(
      sections[0].querySelector('form button[type="submit"]'),
    ).not.toBeNull();
    expect(sections[1].querySelector('h3')?.textContent).toContain(
      'Report an error',
    );
    expect(
      Array.from(main.children)
        .slice(0, 3)
        .map((element) => element.tagName),
    ).toEqual(['P', 'H1', 'P']);
  });

  it('renders the required choices and direct-delivery privacy explanation', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Report a problem');
    expect(text).toContain('Request a tool or feature');
    expect(text).toContain('General question');
    expect(text).toContain('Partnership or business enquiry');
    expect(text).toContain('Send message');
    expect(text).toContain(
      'Please do not include 3D files, private design details or payment details.',
    );
  });

  it('shows readable validation errors for missing required fields', () => {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new SubmitEvent('submit'));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Choose a reason for getting in touch.');
    expect(text).toContain('Enter your email address.');
    expect(text).toContain('Enter a message.');
  });

  it('matches the API character limits before allowing submission', () => {
    fixture.componentInstance['reason'].set('General question');
    fixture.componentInstance['email'].set('ada@example.com');
    fixture.componentInstance['message'].set('x'.repeat(5001));
    fixture.componentInstance['captchaToken'].set('token');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new SubmitEvent('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Message must be 5,000 characters or fewer.',
    );
  });
});

describe('development contact configuration', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('provides the explicit localhost email without enabling form delivery', () => {
    TestBed.configureTestingModule({});
    const config = TestBed.inject(SITE_CONFIG);
    expect(developmentEnvironment.contactEmail).toBe('hello@inspectmesh.com');
    expect(config.contactEmail).toBe(
      resolveContactEmail(developmentEnvironment),
    );
    expect(config.contactEmail).toBeTruthy();
    expect(developmentEnvironment.contactCaptchaSiteKey).toBeUndefined();
  });
});
