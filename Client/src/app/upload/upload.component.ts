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
interface Upload{
  file: File;
    category?:string | null ;
    thumbnail?: File;
    thumbnailUrl?:string;
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
  uploadQueue: Upload[] = [];
 

  constructor(private imageService: ImageService) {}

  save(): void {
    const filesWithThumbnails = this.uploadQueue.map((item) => ({
      objFile: item.file,
      thumbnail: item.thumbnail,
    }));
  
    console.log('Files to upload:', filesWithThumbnails);
  
    this.imageService.uploadImages(filesWithThumbnails, this.category).subscribe({
      next: (response) => {
        console.log('Images and thumbnails uploaded successfully:', response);
        this.uploadQueue = [];
      },
      error: (error) => console.error('Error uploading images and thumbnails:', error),
    });
  }
  

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach((file) => this.addToQueue(file));
    }
  }

  onFolderSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
  
    if (input.files) {
      const selectedFiles = Array.from(input.files);
  
      // Map each file into the uploadQueue if it's a valid thumbnail
      selectedFiles.forEach((file) => {
        const baseFileName = this.getBaseFileName(file.name).toLowerCase();
  
        // Attempt to find a match in the upload queue
        const matchingUpload = this.uploadQueue.find(
          (upload) => this.getBaseFileName(upload.file.name).toLowerCase() === baseFileName
        );
  
        if (matchingUpload) {
          matchingUpload.thumbnail = file; // Associate the thumbnail with the respective upload
          console.log(`Thumbnail matched: ${file.name} -> ${matchingUpload.file.name}`);
        } else {
          console.warn(`No match found for thumbnail: ${file.name}`);
        }
      });
  
      // Update thumbnails in the queue with data URLs
      this.matchThumbnailsToFiles();
    }
  }
  
  matchThumbnailsToFiles(): void {
    this.uploadQueue.forEach((upload) => {
      if (upload.thumbnail) {
        console.log(`Creating thumbnail preview for: ${upload.thumbnail.name}`);
        const reader = new FileReader();
        reader.onload = (e) => {
          upload.thumbnailUrl = e.target?.result as string; // Assign the thumbnail preview URL
        };
        reader.readAsDataURL(upload.thumbnail); // Convert the thumbnail file to a data URL
      } else {
        console.warn(`No thumbnail found for file: ${upload.file.name}`);
      }
    });
  }
  
  
  getBaseFileName(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".");
    return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
  }
  


  drop(event: CdkDragDrop<Upload[]>): void {
    moveItemInArray(this.uploadQueue, event.previousIndex, event.currentIndex);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach((file) => this.addToQueue(file));
    }
  }

  addToQueue(file: File): void {
    const id = crypto.randomUUID();
    this.uploadQueue.push({ file, id });
    if (file.name.endsWith('.obj')) {
      this.create3DPreview(file, id);
    }
    this.matchThumbnailsToFiles(); // Update thumbnails after adding new files
  }

  create3DPreview(file: File, id: string): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const objData = e.target?.result as string;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(50, 50);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(1, 1, 1).normalize();
      scene.add(light);

      camera.position.z = 5;

      const loader = new OBJLoader();
      loader.load(
        URL.createObjectURL(file),
        (obj) => {
          scene.add(obj);
          const animate = () => {
            requestAnimationFrame(animate);
            obj.rotation.y += 0.01;
            renderer.render(scene, camera);
          };
          animate();
        },
        undefined,
        (error) => console.error('Error loading OBJ file:', error),
      );

      const container = document.getElementById(`preview-${id}`);
      if (container) {
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
      }
    };
    reader.readAsDataURL(file);
  }

  removeImage(image: Upload): void {
    this.uploadQueue = this.uploadQueue.filter((item) => item !== image);
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }
}