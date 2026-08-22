import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Quality Tools - STL Checks, Dimensions and Scaling',
      description:
        'Free STL tools to check mesh quality, measure dimensions, convert units, calculate scaling and assess printer build-volume fit.',
      path: '/',
    });
  }
}
