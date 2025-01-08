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
import { MatPaginatorModule } from '@angular/material/paginator';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule,MatDialogModule,MatToolbarModule,MatListModule,MatIconModule,MatGridListModule,MatPaginatorModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent implements OnInit{
images: any;
  dialogRef: any;
  pageSize: number = 8; // Number of images per page
  pageIndex: number = 0; // Initial page index

constructor(public dialog: MatDialog, private imageService: ImageService) {

    
}
ngAfterViewInit(): void {
  this.renderObjFiles();
}

renderObjFiles(): void {
  this.paginatedImages.forEach((file) => {
    const canvas = document.getElementById(`objCanvas-${file.filename}`) as HTMLCanvasElement;

    if (!canvas) {
      console.warn('Canvas not found for file:', file.filename);
      return;
    }

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera with a side perspective
    const camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 5000);
    camera.position.set(0, 80, 0); // Position the camera slightly above and to the side
    camera.lookAt(0, 0, 0); // Ensure the camera looks at the center of the scene

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 2).normalize();
    scene.add(ambientLight, directionalLight);

    // Load and add the .obj file to the scene
    const loader = new OBJLoader();
    loader.load(
      file.url,
      (object) => {
        // Scale down the object to make it smaller
        object.scale.set(0.5, 0.5, 0.5); // Reduce scale to 50% of its original size
        object.rotation.x = Math.PI ; // Rotate the object 90 degrees on the Y-axis for a side view
        object.rotation.y = Math.PI

        
        object.position.set(0, 0, 0); // Center the object in the scene
        scene.add(object);

        // Start rendering loop
        animate();
      },
      undefined,
      (error) => console.error('Error loading .obj file:', error)
    );

    // Animation and rendering loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
  });
}


// Event handler for page changes
onPageChange(event: any): void {
  this.pageIndex = event.pageIndex;
}

// Get current page images
get paginatedImages(): any[] {
  const startIndex = this.pageIndex * this.pageSize;
  return this.images.slice(startIndex, startIndex + this.pageSize);
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
