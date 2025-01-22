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
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule,MatTabsModule,DragDropModule,MatCardModule, MatButtonModule,MatIconModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;

  create3DPreview(file: File): void {
    const canvas = document.getElementById('objPreview') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found.');
      return;
    }

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.z = 5;

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height);

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);

    // Load the .OBJ file
    const loader = new OBJLoader();
    loader.load(
      URL.createObjectURL(file),
      (object) => {
        object.scale.set(1, 1, 1); // Adjust scale if necessary
        this.scene.add(object);

        // Animate the object
        const animate = () => {
          requestAnimationFrame(animate);
          object.rotation.y += 0.01;
          this.controls.update();
          this.renderer.render(this.scene, this.camera);
        };
        animate();
      },
      undefined,
      (error) => console.error('Error loading OBJ file:', error)
    );

    // Initialize OrbitControls for interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
  }

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
      this.create3DPreview(input.files[0])

    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.loadImage(event.dataTransfer.files[0]);
      this.getRes(event.dataTransfer.files[0]);
      this.create3DPreview(event.dataTransfer.files[0])
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
