import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export const MenuLinkVariant = {
  Default: 'default',
  Heading: 'heading',
  AllTools: 'all-tools',
} as const;
export type MenuLinkVariant =
  (typeof MenuLinkVariant)[keyof typeof MenuLinkVariant];

@Component({
  selector: 'app-menu-link',
  imports: [RouterLink, RouterLinkActive],
  host: {
    '[class.tools-group-heading]': 'variant() === menuLinkVariant.Heading',
    '[class.all-tools-link]': 'variant() === menuLinkVariant.AllTools',
  },
  templateUrl: './menu-link.html',
  styleUrl: './menu-link.scss',
})
export class MenuLink {
  readonly label = input.required<string>();
  readonly route = input.required<string>();
  readonly variant = input<MenuLinkVariant>(MenuLinkVariant.Default);
  readonly selected = output<void>();
  protected readonly menuLinkVariant = MenuLinkVariant;
}
