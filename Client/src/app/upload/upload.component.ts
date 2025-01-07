import { Component } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ImageService } from '../Services/image.service';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
interface upload{
  file: File;
     preview?: string;
    category?:string | null ;
    id: string; // Unique ID for each object
}
@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
  standalone: true,
  imports: [CommonModule,CdkDrag,CdkDropList,MatIconModule,DragDropModule,MatInputModule,MatSelectModule,MatFormFieldModule,FormsModule]
})
export class UploadComponent {
 categories: string[] = [
    "Abstract",
    "Modern-Glass",
    "Alabastron",
    "Modern-Mug",
    "Modern-Vase",
    "Amphora",
    "Mug",
    "Aryballos",
    "Native American - Bottle",
    "Bowl",
    "Native American - Bowl",
    "Dinos",
    "Native American - Effigy",
    "Hydria",
    "Native American - Jar",
    "Kalathos",
    "Nestoris",
    "Kantharos",
    "Oinochoe",
    "Krater",
    "Other",
    "Kyathos",
    "Pelike",
    "Kylix",
    "Picher Shaped",
    "Lagynos",
    "Pithoeidi",
    "Lebes",
    "Pithos",
    "Lekythos",
    "Psykter",
    "Lydion",
    "Pyxis",
    "Mastos",
    "Skyphos"
  ];
  category!: string | null;

  constructor(private imageService : ImageService ){}
  save(): void {
    this.imageService.uploadImages(this.uploadQueue.map(item => item.file),this.category).subscribe({
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

  
  uploadQueue: upload[] = []; // Store files and their previews

  // Triggered when files are selected via file input
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => this.addToQueue(file));
    }
  }
  // Handles drag-and-drop reordering within the upload queue
  drop(event: CdkDragDrop<upload[]>): void {
    
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
    const id = crypto.randomUUID(); // Unique ID for tracking
    this.uploadQueue.push({ file, id });

    if (file.name.endsWith('.obj')) {
      this.create3DPreview(file, id);
    }
  }
  create3DPreview(file: File, id: string): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const objData = e.target?.result as string;

      // Initialize Three.js scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(50, 50); // Set canvas size

      // Light and camera setup
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(1, 1, 1).normalize();
      scene.add(light);

      camera.position.z = 5;

      // Load OBJ model
      const loader = new OBJLoader();
      loader.load(
        URL.createObjectURL(file),
        (obj) => {
          scene.add(obj);
          const animate = () => {
            requestAnimationFrame(animate);
            obj.rotation.y += 0.01; // Rotate for better visualization
            renderer.render(scene, camera);
          };
          animate();
        },
        undefined,
        (error) => console.error('Error loading OBJ file:', error)
      );

      // Append canvas to the DOM
      const container = document.getElementById(`preview-${id}`);
      if (container) {
        container.innerHTML = ''; // Clear previous content
        container.appendChild(renderer.domElement);
      }
    };
    reader.readAsDataURL(file);
  }
  // Removes an image from the upload queue
  removeImage(image: upload): void {
    this.uploadQueue = this.uploadQueue.filter(item => item !== image);
  }
  // Allows drag events on the upload area
  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }
}
