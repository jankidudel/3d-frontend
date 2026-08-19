import { TestBed } from '@angular/core/testing';
import { CookieConsentService } from './cookie-consent.service';

describe('CookieConsentService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('shows the banner until a choice is saved', () => {
    const service = TestBed.inject(CookieConsentService);
    TestBed.tick();

    expect(service.bannerVisible()).toBe(true);
    expect(service.analyticsAllowed()).toBe(false);

    service.accept();

    expect(service.bannerVisible()).toBe(false);
    expect(service.analyticsAllowed()).toBe(true);
    expect(localStorage.getItem('cookie_consent_v1')).toBe('accepted');
  });

  it('allows a rejected choice to be changed', () => {
    const service = TestBed.inject(CookieConsentService);
    TestBed.tick();
    service.reject();

    expect(service.analyticsAllowed()).toBe(false);
    expect(localStorage.getItem('cookie_consent_v1')).toBe('rejected');

    service.changeChoice();

    expect(service.bannerVisible()).toBe(true);
    expect(localStorage.getItem('cookie_consent_v1')).toBeNull();
  });
});
