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
    this.results = []
  }
  image: { file: File; preview: string } | null = null;
  results!: SearchResults[];
  

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.loadImage(input.files[0]);

    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.loadImage(event.dataTransfer.files[0]);
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
  
      // Perform the search operation
      this.imageService.Search(file).pipe(
        switchMap((results:SearchResults[]) => {
          this.results = results;
          // Fetch images for each result
          const imageRequests = this.results.map((res) =>
            this.imageService.getImage(res.filename).pipe(
              map((image) => ({
                ...res,
                image,
              }))
            )
          );
          // Wait for all image requests to complete
          return forkJoin(imageRequests);
        })
      ).subscribe({
        next: (updatedResults: SearchResults[]) => {
          this.results = updatedResults;
          console.log(this.results);
        },
        error: (err: any) => {
          console.error('Error fetching images:', err);
          alert('An error occurred while processing your request.');
        },
      });
    };
  
    reader.readAsDataURL(file);
  }
  
  // Converts Blob to a data URL for displaying images
  getImageSrc(image: Blob): string {
    return URL.createObjectURL(image);
  }
}
