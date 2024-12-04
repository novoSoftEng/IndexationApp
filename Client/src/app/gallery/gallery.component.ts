import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule , MatList} from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatGridListModule} from '@angular/material/grid-list';
import { ImageDialogComponent } from './image-dialog/image-dialog.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule,MatDialogModule,MatToolbarModule,MatListModule,MatIconModule,MatGridListModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent {
  images = [
    { url: 'https://via.placeholder.com/300x200', title: 'Image 1' },
    { url: 'https://via.placeholder.com/300x200', title: 'Image 2' },
    { url: 'https://via.placeholder.com/300x200', title: 'Image 3' },
    { url: 'https://via.placeholder.com/300x200', title: 'Image 4' },
    { url: 'https://via.placeholder.com/300x200', title: 'Image 5' },
    { url: 'https://via.placeholder.com/300x200', title: 'Image 6' },
  ];

  constructor(public dialog: MatDialog) {}

  openDialog(image: any): void {
    this.dialog.open(ImageDialogComponent, {
      width: '80%',
      height: '80%',
      data: image
    });
  }

}
