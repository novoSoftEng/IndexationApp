import { Component } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageService } from '../Services/image.service';
@Component({
  selector: 'app-image-transform',
  standalone: true,
  imports: [CommonModule,HttpClientModule,FormsModule],
  templateUrl: './image-transform.component.html',
  styleUrl: './image-transform.component.css'
})
export class ImageTransformComponent {
  selectedFile!: File;
  cropCoords: string = '';
  resizeDims: string = '';
  flip: string = '';
  rotateAngle: string = '';
  transformedImageUrl: string | null = null;
  imageUploaded: boolean = false;

  constructor(private http: HttpClient, private imageService: ImageService) {} // Inject the service

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadImage(file);
    }
  }

  uploadImage(file: File): void {
    this.selectedFile = file;
    this.imageUploaded = true;
  }

  applyTransform(): void {
    if (!this.imageUploaded) {
      return;
    }

    // Call the TransformService to apply transformations
    this.imageService.Transform(
      this.selectedFile,
      this.cropCoords,
      this.resizeDims,
      this.flip,
      this.rotateAngle
    ).subscribe(
      (response: Blob) => {
        this.transformedImageUrl = URL.createObjectURL(response);
      },
      (error) => {
        console.error('Transformation failed:', error);
      }
    );
  }
}
