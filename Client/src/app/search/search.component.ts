import {  CdkDrag, CdkDropList, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {MatTabsModule} from '@angular/material/tabs';
import { SearchResults } from '../interfaces/search-results';
import { switchMap, map, forkJoin } from 'rxjs';
import { ImageService } from '../Services/image.service';
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule,MatTabsModule,DragDropModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  constructor(private imageService : ImageService){
  }
  image: { file: File; preview: string } | null = null;
  results: SearchResults[]=[];
  

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.loadImage(input.files[0]);
      this.getRes(input.files[0]);

    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.loadImage(event.dataTransfer.files[0]);
      this.getRes(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private loadImage(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      this.image = {
        file: file,
        preview: reader.result as string,
      };
    };
  
    reader.readAsDataURL(file);
  }
  private getRes(file: File): void {
    this.imageService.Search(file).subscribe((searchResults: SearchResults[]) => {
      this.results = searchResults; // Store the results in the component
  
      // For each result, fetch the associated image as a Blob
      this.results.forEach((result) => {
        this.imageService.downloadFile(result.filename).subscribe(
          (blob) => {
            // Convert Blob to an Object URL for display
            result.image = URL.createObjectURL(blob);
          },
          (error) => {
            console.error(`Failed to download image for ${result.filename}:`, error);
          }
        );
      });
  
      console.log("Enhanced images with Blob URLs:", this.results);
    });
  }
  
  // Converts Blob to a data URL for displaying images
  getImageSrc(image: Blob): string {
    return URL.createObjectURL(image);
  }
}
