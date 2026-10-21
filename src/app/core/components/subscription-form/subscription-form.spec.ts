import { TestBed } from '@angular/core/testing';
import { SubscriptionService } from '../../api/subscription.service';
import { TurnstileService } from '../../contact/turnstile.service';
import { SITE_CONFIG } from '../../site/site-config';
import { SubscriptionFormComponent } from './subscription-form';

describe('SubscriptionFormComponent', () => {
  it('keeps Subscribe disabled until CAPTCHA verification succeeds', async () => {
    let verify: ((token: string) => void) | undefined;
    let widgetSize: string | undefined;
    TestBed.configureTestingModule({
      imports: [SubscriptionFormComponent],
      providers: [
        {
          provide: SITE_CONFIG,
          useValue: { contactCaptchaSiteKey: 'site-key' },
        },
        { provide: SubscriptionService, useValue: { subscribe: vi.fn() } },
        {
          provide: TurnstileService,
          useValue: {
            load: vi.fn().mockResolvedValue({
              render: vi.fn(
                (
                  _element: HTMLElement,
                  options: {
                    callback: (token: string) => void;
                    size: string;
                  },
                ) => {
                  verify = options.callback;
                  widgetSize = options.size;
                  return 'captcha-widget';
                },
              ),
              reset: vi.fn(),
            }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SubscriptionFormComponent);
    fixture.componentRef.setInput('idPrefix', 'test-subscribe');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Complete verification to enable Subscribe.',
    );
    expect(widgetSize).toBe('flexible');

    verify?.('verified-token');
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });
});
