import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeTool } from '../../../features/home/home-tools';

@Component({
  selector: 'app-format-tools-grid',
  imports: [RouterLink],
  templateUrl: './format-tools-grid.html',
  styleUrl: './format-tools-grid.scss',
})
export class FormatToolsGrid {
  readonly heading = input.required<string>();
  readonly tools = input.required<readonly HomeTool[]>();
}
