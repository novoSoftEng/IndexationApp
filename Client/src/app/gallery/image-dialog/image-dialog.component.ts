import { AfterViewInit, Component, EventEmitter, inject, Input, model, Output, Type } from '@angular/core';
import { MatDialogModule ,MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle } from '@angular/material/dialog';
import { ImageService } from '../../Services/image.service';
import { CommonModule } from '@angular/common';
import {
  Chart,
  registerables // This includes all necessary components for most charts
} from 'chart.js';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Register all necessary Chart.js components globally
Chart.register(...registerables);

@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [CommonModule,MatDialogModule],
  templateUrl: './image-dialog.component.html',
  styleUrl: './image-dialog.component.css'
})
export class ImageDialogComponent implements AfterViewInit {
  readonly dialogRef = inject(MatDialogRef<ImageDialogComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  @Output() deleted = new EventEmitter<any>();

  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;

  constructor(private imageService:ImageService) {}

  ngAfterViewInit(): void {
    this.renderObjFile();
  }

  renderObjFile(): void {
    const canvas = document.getElementById('objCanvas') as HTMLCanvasElement;

    if (!canvas) {
      console.error('Canvas element not found.');
      return;
    }

    // Initialize THREE.js scene, camera, and renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    this.camera.position.set(10, 10, 20); // Set initial camera position

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft ambient light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5).normalize();
    this.scene.add(ambientLight, directionalLight);

    // Load and add the .obj file
    const loader = new OBJLoader();
    loader.load(
      this.data.url, // URL of the .obj file
      (object) => {
        // Scale and position the object
        object.scale.set(0.5, 0.5, 0.5);
        object.position.set(0, 0, 0);
        object.rotation.x = Math.PI; // Rotate to ensure correct orientation
        this.scene.add(object);

        // Start animation loop
        this.animate();
      },
      undefined,
      (error) => console.error('Error loading .obj file:', error)
    );

    // Add OrbitControls for interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Smooth interaction
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true; // Allow zooming
    this.controls.enablePan = true; // Allow panning
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update(); // Update the controls
    this.renderer.render(this.scene, this.camera); // Render the scene
  }

  downloadImage(): void {
    const link = document.createElement('a');
    link.href = this.data.url;
    link.download = this.data.image;
    link.click();
  }

  deleteImage(): void {
    this.imageService.deleteFile(this.data.image).subscribe((msg) => {
      console.log('Image deleted:', msg.message);
    });
    this.deleted.emit(this.data);
    this.dialogRef.close({ action: 'delete', image: this.data.image });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
  

