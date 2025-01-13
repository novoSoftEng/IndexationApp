import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {MatTabsModule} from '@angular/material/tabs';
import { SearchResults } from '../interfaces/search-results';
import { switchMap, map, forkJoin } from 'rxjs';
import { ImageService } from '../Services/image.service';
import { MatButtonModule } from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule,MatTabsModule,DragDropModule,MatCardModule, MatButtonModule,MatIconModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  Search() {
    const likedDetails$ = Array.from(this.likedIds).map((filename) =>
      this.imageService.getImageDetails(filename.filename)
    );
  
    const leftoverDetails$ = this.results
      .filter((result) => !this.likedIds.has(result))
      .map((result) => this.imageService.getImageDetails(result.filename));
  
    // Combine Observables and subscribe to get results
    forkJoin([...likedDetails$, ...leftoverDetails$]).subscribe({
      next: (details) => {
        // Split the details into liked and leftover arrays
        const likedDetails = details.slice(0, likedDetails$.length);
        const leftoverDetails = details.slice(likedDetails$.length);
        // Create the characteristics object
const characteristics = {
  relevant: likedDetails.map((detail) => detail.image[0]), // Extract inner objects
  irrelevant: leftoverDetails.map((detail) => detail.image[0]),
};
        this.getRes(this.image!.file,characteristics);

  
        console.log('Liked Details:', likedDetails);
        console.log('Leftover Details:', leftoverDetails);
  
        // Proceed with further processing
      },
      error: (err) => {
        console.error('Error fetching image details:', err);
      },
    });
  }
  
  
  likedIds: Set<SearchResults> = new Set(); // Store liked IDs independently
  toggleLike(id: SearchResults): void {
    
    if (this.likedIds.has(id)) {
      this.likedIds.delete(id); // Unlike
    } else {
      this.likedIds.add(id); // Like
    }
  }

  isLiked(id: SearchResults): boolean {
    return this.likedIds.has(id);
  }
  constructor(private imageService : ImageService){
  }
  image: { file: File; preview: string } | null = null;
  results: SearchResults[]=[];
  downloadImage(result:any): void {
    const link = document.createElement('a');
    link.href = result.image;
    link.download = result.filename;
    link.click();
  }

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
    
    
    const reader = new FileReader();
    reader.onload = () => {
      this.image = {
        file: file,
        preview: reader.result as string,
      };
    };
  
    reader.readAsDataURL(file);
  }
  private getRes(file: File,characteristics ?:any): void {
    this.imageService.Search(file,characteristics).subscribe((searchResults: SearchResults[]) => {
      this.results = searchResults; // Store the results in the component
      console.log(this.results)
  
      // For each result, fetch the associated image as a Blob
      this.results.forEach((result) => {
        this.imageService.downloadFile(result.thumbnail).subscribe(
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
