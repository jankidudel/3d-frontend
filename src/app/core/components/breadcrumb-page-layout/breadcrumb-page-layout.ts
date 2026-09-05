import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-breadcrumb-page-layout',
  imports: [BreadcrumbsComponent, RouterOutlet],
  templateUrl: './breadcrumb-page-layout.html',
})
export class BreadcrumbPageLayout {}
