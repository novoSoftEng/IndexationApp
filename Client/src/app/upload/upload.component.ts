import { Component } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ImageService } from '../Services/image.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
  standalone: true,
  imports: [CommonModule,CdkDrag,CdkDropList,MatIconModule,DragDropModule]
})
export class UploadComponent {
  constructor(private imageService : ImageService ){}
  save(): void {
    this.imageService.uploadImages(this.uploadQueue.map(item => item.file)).subscribe({
      next: (response) => {
        console.log('Images uploaded successfully:', response);
        // Optional: Reset the upload queue after successful upload
        this.uploadQueue = [];
      },
      error: (error) => {
        console.error('Error uploading images:', error);
      }
    });
  }
  
  uploadQueue: { file: File, preview: string }[] = []; // Store files and their previews

  // Triggered when files are selected via file input
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => this.addToQueue(file));
    }
  }
  // Handles drag-and-drop reordering within the upload queue
  drop(event: CdkDragDrop<{ file: File, preview: string }[]>): void {
    moveItemInArray(this.uploadQueue, event.previousIndex, event.currentIndex);
  }

  // Triggered when files are dropped onto the upload area
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach(file => this.addToQueue(file));
    }
  }
  // Adds a file to the queue and creates its preview
  addToQueue(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadQueue.push({ file, preview: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  // Removes an image from the upload queue
  removeImage(image: { file: File, preview: string }): void {
    this.uploadQueue = this.uploadQueue.filter(item => item !== image);
  }
  // Allows drag events on the upload area
  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }
}
