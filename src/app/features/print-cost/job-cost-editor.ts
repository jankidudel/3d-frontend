import { Component, computed, inject, signal, ElementRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { createPdf } from '../../shared/pdf-engine';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import { COST_CURRENCY_OPTIONS } from './print-cost';
import {
  blankJob,
  blankPlate,
  workedJob,
  calculateJobCost,
  jobRecord,
  jobRecordLines,
  JobCostInputs,
  JobPlate,
  JobMaterial,
  MaterialBasis,
  MAX_JOB_PLATES,
  MAX_PLATE_MATERIALS,
} from './job-cost';
@Component({
  selector: 'app-job-cost-editor',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './job-cost-editor.html',
  styleUrl: './job-cost-editor.scss',
})
export class JobCostEditor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly session = inject(JobPlanningSession);
  private readonly router = inject(Router);
  readonly routes = PublicRouteUrl;
  readonly guides = GuideRouteUrl;
  readonly currencies = COST_CURRENCY_OPTIONS;
  readonly bases = MaterialBasis;
  readonly maxPlates = MAX_JOB_PLATES;
  readonly maxMaterials = MAX_PLATE_MATERIALS;
  readonly input = signal(this.session.jobDraft ?? blankJob());
  readonly pending = signal(this.session.peek(PlanningDestination.Cost));
  readonly result = computed(() => calculateJobCost(this.input()));
  readonly record = computed(() => jobRecord(this.input()));
  readonly summary = computed(() => {
    const record = this.record();
    return record ? jobRecordLines(record).join('\n') : '';
  });
  readonly message = signal('');
  readonly copyFallback = signal(false);
  readonly materialScopes = computed(() => [
    ...new Set(
      this.input()
        .plates.flatMap((p) => p.materials.map((m) => m.label))
        .filter(Boolean),
    ),
  ]);
  readonly selectedScope = signal('');
  readonly compatible = signal(false);
  readonly sequentialConfirmed = signal(false);
  set<K extends keyof JobCostInputs>(key: K, value: JobCostInputs[K]): void {
    this.input.update((i) => ({ ...i, [key]: value }));
    this.save();
  }
  number(event: Event): number {
    const text = (event.target as HTMLInputElement).value.trim();
    return text === '' ? NaN : Number(text);
  }
  plate<K extends keyof JobPlate>(
    index: number,
    key: K,
    value: JobPlate[K],
  ): void {
    this.input.update((i) => ({
      ...i,
      plates: i.plates.map((p, n) =>
        n === index ? { ...p, [key]: value } : p,
      ),
    }));
    this.save();
  }
  material<K extends keyof JobMaterial>(
    index: number,
    materialIndex: number,
    key: K,
    value: JobMaterial[K],
  ): void {
    const materials = this.input().plates[index]!.materials.map((m, n) =>
      n === materialIndex ? { ...m, [key]: value } : m,
    );
    this.plate(index, 'materials', materials);
  }
  addPlate(): void {
    const plates = this.input().plates;
    if (plates.length >= MAX_JOB_PLATES) {
      return;
    }
    this.set('plates', [
      ...plates,
      blankPlate(Math.max(0, ...plates.map((p) => p.id)) + 1),
    ]);
  }
  removePlate(index: number): void {
    this.set(
      'plates',
      this.input().plates.filter((_, n) => n !== index),
    );
    this.focusControl('.add-plate');
  }
  addMaterial(index: number): void {
    const materials = this.input().plates[index]!.materials;
    if (materials.length < MAX_PLATE_MATERIALS) {
      this.plate(index, 'materials', [
        ...materials,
        { ...blankPlate(1).materials[0]! },
      ]);
    }
  }
  removeMaterial(index: number, materialIndex: number): void {
    this.plate(
      index,
      'materials',
      this.input().plates[index]!.materials.filter(
        (_, n) => n !== materialIndex,
      ),
    );
    this.focusControl(
      `[data-material-add='${this.input().plates[index]!.id}']`,
    );
  }
  example(): void {
    this.input.set(workedJob());
    this.compatible.set(false);
    this.sequentialConfirmed.set(false);
    this.save();
  }
  applyLayout(): void {
    const offer = this.pending();
    if (!offer || this.input().plates.length >= MAX_JOB_PLATES) {
      return;
    }
    this.addPlate();
    const index = this.input().plates.length - 1;
    this.plate(index, 'unitsPerRun', offer.value);
    this.plate(index, 'source', offer.basis);
    this.dismissLayout();
    this.message.set(
      'Added the confirmed count. Enter actual sliced duration and material; geometry supplies neither.',
    );
  }
  dismissLayout(): void {
    this.session.take(PlanningDestination.Cost);
    this.pending.set(null);
  }
  private focusControl(selector: string): void {
    setTimeout(
      () =>
        this.host.nativeElement
          .querySelector<HTMLButtonElement>(selector)
          ?.focus(),
      0,
    );
  }
  private save(): void {
    this.session.jobDraft = structuredClone(this.input());
  }
  async sendPrice(): Promise<void> {
    const record = this.record();
    if (!record) {
      return;
    }
    this.session.offer({
      destination: PlanningDestination.Price,
      value: record.result.total,
      basis:
        'Explicit job production total. No quantity multiplication or additional failure uplift.',
      currency: this.input().currency,
      record,
    });
    await this.router.navigateByUrl(PublicRouteUrl.PrintPriceCalculator);
  }
  async sendMaterial(): Promise<void> {
    if (
      !this.result() ||
      !this.compatible() ||
      !this.selectedScope() ||
      !this.materialScopes().includes(this.selectedScope())
    ) {
      return;
    }
    const grams = this.input().plates.reduce(
      (sum, p) =>
        sum +
        p.materials
          .filter((m) => m.label === this.selectedScope())
          .reduce((n, m) => n + (m.grams + m.additionalGrams) * p.repeats, 0),
      0,
    );
    if (grams <= 0) {
      this.message.set(
        'No positive consumption is recorded for this scope. Review the material rows before checking a spool.',
      );
      return;
    }
    this.session.offer({
      destination: PlanningDestination.Spool,
      value: grams,
      basis: `Complete entered consumption for ${this.selectedScope()}; includes separately identified additional material. User confirmed compatible spool scope. No failure uplift or reserve added.`,
    });
    await this.router.navigateByUrl(PublicRouteUrl.FilamentRemainingCalculator);
  }
  async sendDuration(): Promise<void> {
    const result = this.result();
    if (!result || !this.sequentialConfirmed()) {
      return;
    }
    this.session.offer({
      destination: PlanningDestination.Finish,
      value: result.sequentialHours,
      basis:
        'Sum of entered sequential sliced run durations only; excludes queue gaps, cooling, finishing and dispatch. Set start, timezone, correction and additional time deliberately.',
    });
    await this.router.navigateByUrl(PublicRouteUrl.PrintFinishTimeCalculator);
  }
  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.summary());
      this.message.set('Job record copied.');
    } catch {
      this.copyFallback.set(true);
      this.message.set('Select and copy the job record below.');
    }
  }
  download(): void {
    const record = this.record();
    if (!record) {
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inspectmesh-job.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.message.set('Job record download requested.');
  }
  print(): void {
    window.print();
  }
  async pdf(): Promise<void> {
    const pdf = await createPdf();
    pdf.setFontSize(10);
    const lines: string[] = pdf.splitTextToSize(this.summary(), 180);
    let y = 16;
    pdf.setFontSize(10);
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(line, 14, y);
      y += 5;
    }
    pdf.save('inspectmesh-job.pdf');
  }
}
