import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule , MatList} from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatGridListModule} from '@angular/material/grid-list';
import { ImageDialogComponent } from './image-dialog/image-dialog.component';
import { CommonModule } from '@angular/common';
import { ImageService } from '../Services/image.service';
import { filter, forkJoin, map, of, switchMap, tap } from 'rxjs';
@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule,MatDialogModule,MatToolbarModule,MatListModule,MatIconModule,MatGridListModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent implements OnInit{
images: any;
  dialogRef: any;
constructor(public dialog: MatDialog, private imageService: ImageService) {

    
}
  ngOnInit(): void {
    this.imageService.getAllImages().pipe(
      map((response: { images: string[] }) => response.images), // Extract the images array
      switchMap((images: string[]) =>
        forkJoin(
          images.map((filename: string) =>
            this.imageService.downloadFile(filename).pipe(
              map((blob) => ({
                filename,
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
  
      // Listen for category changes
      this.imageService.selectedCategory$
      .pipe(
        // Log the category emitted
        tap((cat) => console.log('[DEBUG] Category selected:', cat)),
    
        // Ignore undefined or null categories
        filter((cat) => !!cat),
    
        // Fetch images by category
        switchMap((cat) => 
          this.imageService.getImagesByCat(cat!).pipe(
            tap((response) => console.log('[DEBUG] Images API response:', response)),
    
            // Extract the images array
            map((response: { images: any[] }) => response.images),
    
            // Log the extracted images
            tap((images) => console.log('[DEBUG] Extracted images:', images)),
    
            // Download images and generate URLs
            switchMap((images: any[]) =>
              forkJoin(
                images.map((image) =>
                  this.imageService.downloadFile(image.filename).pipe(
                    tap(() => console.log('[DEBUG] Downloading image:', image.filename)),
                    map((blob) => ({
                      ...image, // Retain original image metadata
                      url: URL.createObjectURL(blob), // Create object URL
                    }))
                  )
                )
              ).pipe(
                // Log the enhanced images array
                tap((enhancedImages) => console.log('[DEBUG] Enhanced images:', enhancedImages))
              )
            )
          )
        )
      )
      .subscribe(
        (enhancedImages) => {
          this.images = enhancedImages;
          console.log('[INFO] Final images array:', this.images);
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
