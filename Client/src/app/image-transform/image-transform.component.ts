import { Component } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-image-transform',
  standalone: true,
  imports: [CommonModule,HttpClientModule,FormsModule],
  templateUrl: './image-transform.component.html',
  styleUrl: './image-transform.component.css'
})
export class ImageTransformComponent {
  selectedFile: File | null = null;
  cropCoords: string = '';
  resizeDims: string = '';
  flip: string = '';
  rotateAngle: string = '';
  transformedImageUrl: string | null = null;
  imageUploaded: boolean = false;

  constructor(private http: HttpClient) {}

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadImage(file);
    }
  }

  uploadImage(file: File): void {
    const formData = new FormData();
    formData.append('image', file);

    // Upload image to the server
    this.http.post('/api/transform', formData, { responseType: 'blob' })
      .subscribe(
        (response: Blob) => {
          this.imageUploaded = true;
          this.transformedImageUrl = URL.createObjectURL(response);
        },
        (error) => {
          console.error('Image upload failed:', error);
          alert('Failed to upload image.');
        }
      );
  }

  applyTransform(): void {
    if (!this.imageUploaded) {
      return;
    }

    const formData = new FormData();
    formData.append('image', this.selectedFile as Blob);

    if (this.cropCoords) {
      formData.append('crop_coords', this.cropCoords);
    }

    if (this.resizeDims) {
      formData.append('resize_dims', this.resizeDims);
    }

    if (this.flip) {
      formData.append('flip', this.flip);
    }

    if (this.rotateAngle) {
      formData.append('rotate_angle', this.rotateAngle);
    }

    // Make live API request for transformations
    this.http.post('http://localhost:5000/transform', formData, { responseType: 'blob' })
      .subscribe(
        (response: Blob) => {
          this.transformedImageUrl = URL.createObjectURL(response);
        },
        (error) => {
          console.error('Transformation failed:', error);
        }
      );
  }
}