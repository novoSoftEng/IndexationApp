import { Component, EventEmitter, inject, Output } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { RouterModule, RouterOutlet } from '@angular/router';
import {MatChipsModule} from '@angular/material/chips';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css',
  standalone: true,
  imports: [CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    AsyncPipe,
    RouterOutlet,
    RouterModule,
    MatChipsModule
  ]
})
export class NavigationComponent {
selectedCategory: any;
onCategorySelect(_t47: any) {
throw new Error('Method not implemented.');
}
categories: string[] = ['Grass', 'Field','Industry','RiverLake','Forest','Resident','Parking']; // Example categories
  category!: string | null;
  private breakpointObserver = inject(BreakpointObserver);
// Output event emitter to notify parent components
@Output() categorySelected = new EventEmitter<string>();
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

// Handler for chip list selection change
onCategoryChange(event: any): void {
  const selectedCategory = event.source?.value; // Get the selected value
  this.selectedCategory = selectedCategory; // Update the local selected category
  this.categorySelected.emit(selectedCategory); // Emit the selected category
  console.log('Category selected:', selectedCategory);
}
}
