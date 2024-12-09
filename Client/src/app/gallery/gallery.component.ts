import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule , MatList} from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatGridListModule} from '@angular/material/grid-list';
import { ImageDialogComponent } from './image-dialog/image-dialog.component';
import { CommonModule } from '@angular/common';
import { ImageService } from '../Services/image.service';
import { forkJoin, map, switchMap } from 'rxjs';
@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule,MatDialogModule,MatToolbarModule,MatListModule,MatIconModule,MatGridListModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent {
images: any;
  dialogRef: any;
constructor(public dialog: MatDialog, private imageService: ImageService) {
  this.imageService.getAllImages().pipe(
    map((response: { images: string[] }) => response.images), // Extract the images array
    switchMap((images: string[]) =>
      forkJoin(
        images.map((image: string) =>
          this.imageService.downloadFile(image).pipe(
            map((blob) => ({
              image,
              url: URL.createObjectURL(blob),
            }))
          )
        )
      )
    )
  ).subscribe((enhancedImages) => {
    this.images = enhancedImages; // Store the final array in the component
    console.log("Enhanced images", this.images);
  });
}

delete(deletedImage: any): void {
  console.log('Image deleted in parent:', deletedImage);
  // Update the DOM or perform other actions
  this.images = this.images.filter((img: any) => img.image !== deletedImage.image);
  console.log(this.images);
}
  openDialog(image: any): void {
   this.dialogRef =  this.dialog.open(ImageDialogComponent, {
      width: '80%',
      height: '80%',
      data: image
    });
    this.dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'delete') {
        this.delete(result);
      }
    });
  }

}
