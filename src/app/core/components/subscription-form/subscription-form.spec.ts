import { TestBed } from '@angular/core/testing';
import { SubscriptionService } from '../../api/subscription.service';
import { TurnstileService } from '../../contact/turnstile.service';
import { SITE_CONFIG } from '../../site/site-config';
import { SubscriptionFormComponent } from './subscription-form';

describe('SubscriptionFormComponent', () => {
  it('keeps Subscribe disabled until CAPTCHA verification succeeds', async () => {
    let verify: ((token: string) => void) | undefined;
    let expire: (() => void) | undefined;
    let widgetSize: string | undefined;
    const load = vi.fn().mockResolvedValue({
      render: vi.fn(
        (
          _element: HTMLElement,
          options: {
            callback: (token: string) => void;
            'expired-callback': () => void;
            size: string;
          },
        ) => {
          verify = options.callback;
          expire = options['expired-callback'];
          widgetSize = options.size;
          return 'captcha-widget';
        },
      ),
      reset: vi.fn(),
    });
    const subscribe = vi.fn();
    TestBed.configureTestingModule({
      imports: [SubscriptionFormComponent],
      providers: [
        {
          provide: SITE_CONFIG,
          useValue: { contactCaptchaSiteKey: 'site-key' },
        },
        { provide: SubscriptionService, useValue: { subscribe } },
        {
          provide: TurnstileService,
          useValue: { load },
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
    expect(load).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Enter your email to start verification.',
    );

    const email = fixture.nativeElement.querySelector('input[type="email"]');
    email.dispatchEvent(new FocusEvent('focus'));
    email.value = 'maker@example.com';
    email.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(load).toHaveBeenCalledTimes(1);
    expect(widgetSize).toBe('flexible');
    expect(button.disabled).toBe(true);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    expect(subscribe).not.toHaveBeenCalled();

    verify?.('verified-token');
    fixture.detectChanges();

    expect(button.disabled).toBe(false);

    expire?.();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });
});
