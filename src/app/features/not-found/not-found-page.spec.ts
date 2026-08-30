import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('explains the missing page and provides recovery links', () => {
    TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'That page could not be found.',
    );
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/tools',
    ]);
  });
});
