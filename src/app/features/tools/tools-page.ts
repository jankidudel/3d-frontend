import { WorkflowPathsComponent } from '../repeat-workflows/workflow-paths';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { toolDirectoryGroups, ToolType } from './tool-directory';

@Component({
  selector: 'app-tools-page',
  imports: [WorkflowPathsComponent, RouterLink],
  templateUrl: './tools-page.html',
  styleUrl: './tools-page.scss',
})
export class ToolsPage {
  readonly routes = PublicRouteUrl;
  readonly toolGroups = toolDirectoryGroups;
  readonly toolTypes = Object.values(ToolType);
  readonly query = signal('');
  readonly selectedType = signal<ToolType | null>(null);
  readonly totalTools = this.toolGroups.reduce(
    (total, group) => total + group.tools.length,
    0,
  );
  readonly filteredToolGroups = computed(() => {
    const terms = this.query()
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const type = this.selectedType();
    return this.toolGroups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) => {
          const text = [tool.title, tool.description, group.title, ...tool.tags]
            .join(' ')
            .toLocaleLowerCase();
          return (
            (!type || tool.tags.includes(type)) &&
            terms.every((term) => text.includes(term))
          );
        }),
      }))
      .filter((group) => group.tools.length > 0);
  });
  readonly resultCount = computed(() =>
    this.filteredToolGroups().reduce(
      (total, group) => total + group.tools.length,
      0,
    ),
  );
  readonly hasFilters = computed(
    () => this.query().length > 0 || this.selectedType() !== null,
  );
  private readonly seo = inject(SeoService);

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  updateType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedType.set(
      this.toolTypes.find((type) => type === value) ?? null,
    );
  }

  clearFilters(): void {
    this.query.set('');
    this.selectedType.set(null);
  }

  constructor() {
    this.seo.apply({
      title: '3D File Tools for Inspection and Printing | InspectMesh',
      description:
        'Free online 3D file tools to inspect mesh quality, check print readiness, measure dimensions, calculate volume and prepare models for 3D printing.',
      path: PublicRouteUrl.AllTools,
    });
  }
}
