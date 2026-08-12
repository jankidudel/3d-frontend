import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('3D Quality Tools – Tools for Better 3D Printing');
    this.meta.updateTag({
      name: 'description',
      content: 'Simple tools for checking and analysing STL files for 3D printing.',
    });
  }
}
