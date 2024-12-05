import { Component, inject, Input, model } from '@angular/core';
import { MatDialogModule ,MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle } from '@angular/material/dialog';
import { GalleryComponent } from '../gallery.component';
import { ImageService } from '../../Services/image.service';
@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './image-dialog.component.html',
  styleUrl: './image-dialog.component.css'
})
export class ImageDialogComponent {
  constructor (private imageService: ImageService){}
  readonly dialogRef = inject(MatDialogRef<GalleryComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);

  onNoClick(): void {
    this.dialogRef.close();
  }
  // Download the image
  downloadImage(): void {
    const link = document.createElement('a');
    link.href = this.data.url; // URL of the image
    link.download = this.data.image; // Suggested file name
    link.click();
  }

  // Trigger delete action
  deleteImage(): void {
    // Emit or handle the deletion process
    console.log('Delete action triggered for:', this.data.image);
    this.imageService.deleteFile(this.data.image).subscribe((msg)=>{
      console.log("image deleted",msg.message);
    })

    this.dialogRef.close({ action: 'delete', image: this.data.image });
  }

}
