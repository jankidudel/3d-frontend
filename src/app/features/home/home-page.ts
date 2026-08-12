import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="page">
      <p class="eyebrow">3D printing file tools</p>
      <h1>3D Quality Tools</h1>
      <p class="lead">Simple tools for checking and analysing files for 3D printing.</p>
      <section class="tool card" aria-labelledby="stl-tool-title">
        <div>
          <h2 id="stl-tool-title">STL Quality Check</h2>
          <p>Check STL files for common mesh and geometry problems before you print.</p>
        </div>
        <a class="button" routerLink="/stl-quality-check">Check an STL file</a>
      </section>
    </main>
  `,
  styles: [`
    .tool { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-top: 3rem; padding: clamp(1.25rem, 4vw, 2.25rem); }
    .tool h2 { margin: 0 0 .25rem; }
    .tool p { margin: 0; color: var(--muted); }
    .button { flex: 0 0 auto; }
    @media (max-width: 38rem) { .tool { align-items: stretch; flex-direction: column; } }
  `],
})
export class HomePage {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('3D Quality Tools – Tools for Better 3D Printing');
    this.meta.updateTag({ name: 'description', content: 'Simple tools for checking and analysing STL files for 3D printing.' });
  }
}
