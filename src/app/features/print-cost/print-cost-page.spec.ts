import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { JobsService } from '../../core/api/jobs.service';
import { SeoService } from '../../core/seo/seo.service';
import {
  COST_CURRENCY_OPTIONS,
  DEFAULT_ELECTRICITY_PRICE_PER_KWH,
} from './print-cost';
import { PrintCostPage } from './print-cost-page';

describe('PrintCostPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PrintCostPage],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: {} },
        { provide: JobCreationService, useValue: {} },
        { provide: JobsService, useValue: {} },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(PrintCostPage);
    fixture.componentInstance.job.set({
      id: 'model-1',
      fileName: 'model.stl',
      fileSizeBytes: 1,
      status: 'completed',
      createdAt: '2026-09-05T00:00:00Z',
      report: { volume: 1000 },
    });
    fixture.detectChanges();
    return fixture;
  }

  it('uses the shared radio-option pattern with associated labels', () => {
    const fixture = render();
    const options = Array.from(
      fixture.nativeElement.querySelectorAll('.radio-option'),
    ) as HTMLElement[];

    expect(options).toHaveLength(4);
    for (const option of options) {
      const input = option.querySelector(
        'input[type="radio"]',
      ) as HTMLInputElement;
      const label = option.querySelector('label') as HTMLLabelElement;
      expect(input.id).not.toBe('');
      expect(label.htmlFor).toBe(input.id);
    }
  });

  it('selects the matching option when its visible label is clicked', () => {
    const fixture = render();
    const formatLabel = fixture.nativeElement.querySelector(
      'label[for="format-3mf"]',
    ) as HTMLLabelElement;
    const sourceLabel = fixture.nativeElement.querySelector(
      'label[for="source-model"]',
    ) as HTMLLabelElement;

    formatLabel.click();
    sourceLabel.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.fileFormat()).toBe('3mf');
    expect(fixture.componentInstance.source()).toBe('model');
  });

  it('renders currency options from the shared constant catalogue', () => {
    const fixture = render();
    const currencySelect = fixture.nativeElement.querySelector(
      'option[value="USD"]',
    )?.parentElement as HTMLSelectElement;
    const options = Array.from(currencySelect.options);
    const values = options.map((option) => option.value);

    expect(values).toEqual(COST_CURRENCY_OPTIONS.map((option) => option.value));
    fixture.componentInstance.currency.set('OTHER');
    expect(fixture.componentInstance.format(12.5)).toBe('12.50');
  });

  it('starts with the editable generic electricity-price default', () => {
    expect(render().componentInstance.electricityPrice()).toBe(
      DEFAULT_ELECTRICITY_PRICE_PER_KWH,
    );
  });
});
