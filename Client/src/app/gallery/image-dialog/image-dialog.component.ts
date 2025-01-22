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
  fourierCoefficients: number[] = []; // Fourier coefficients array
  zernikeMoments: number[] = []; // Zernike moments array
  readonly dialogRef = inject(MatDialogRef<ImageDialogComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  @Output() deleted = new EventEmitter<any>();

  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;

  public imageDetails: any = null; // Store fetched image details

  constructor(private imageService: ImageService) {}

  ngAfterViewInit(): void {
    this.fetchImageDetails();
    this.renderObjFile();
  }

  fetchImageDetails(): void {
    this.imageService.getImageDetails(this.data.filename).subscribe(
      (details) => {
        console.log('Image Details:', details);
  
        if (details.image && details.image.length > 0) {
          const imageDetails = details.image[0]; // Extract the first image object
          this.imageDetails = imageDetails; // Store the fetched details for binding
  
          // Render characteristics
          if (imageDetails.characteristics) {
            this.renderCharacteristics(imageDetails.characteristics);
          } else {
            console.warn('No characteristics available for the image.');
          }
        } else {
          console.warn('No image details found.');
        }
      },
      (error) => {
        console.error('Error fetching image details:', error);
      }
    );
  }
  renderCharacteristics(characteristics: any): void {
    if (!characteristics) {
      console.warn('No characteristics available to render.');
      return;
    }

    // Find the container in the template
    const container = document.querySelector('.characteristics-container');

    if (!container) {
      console.error('Characteristics container not found in the DOM.');
      return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Dynamically add characteristics as a list
    const characteristicsList = document.createElement('ul');

    Object.entries(characteristics).forEach(([key, value]) => {
      const listItem = document.createElement('li');
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); // Format key
      let formattedValue: string;

      if (Array.isArray(value)) {
        formattedValue = value.join(', '); // Join arrays into a string
        if (key === 'fourier_coefficients') {
          this.renderFourierChart(value); // Render Fourier Chart
          return; // Skip adding this to the list
        } else if (key === 'zernike_moments') {
          this.renderZernikeChart(value); // Render Zernike Chart
          return; // Skip adding this to the list
        }
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Yes' : 'No'; // Format booleans
      } else {
        formattedValue = value?.toString() || 'N/A'; // Format other types
      }

      listItem.textContent = `${formattedKey}: ${formattedValue}`;
      characteristicsList.appendChild(listItem);
    });

    container.appendChild(characteristicsList);
  }

  renderFourierChart(coefficients: number[]): void {
    const canvas = document.getElementById('fourierChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element for Fourier chart not found.');
      return;
    }

    // Ensure the canvas is available
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get context for Fourier chart');
      return;
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: coefficients.slice(0, 100).map((_, index) => index + 1), // Limit to first 100 coefficients
        datasets: [{
          label: 'Fourier Coefficients',
          data: coefficients.slice(0, 100),
          borderColor: 'rgba(75, 192, 192, 1)',
          fill: false
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  renderZernikeChart(moments: number[]): void {
    const canvas = document.getElementById('zernikeChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element for Zernike chart not found.');
      return;
    }

    // Ensure the canvas is available
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get context for Zernike chart');
      return;
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: moments.slice(0, 50).map((_, index) => `Moment ${index + 1}`), // Limit to first 50 moments
        datasets: [{
          label: 'Zernike Moments',
          data: moments.slice(0, 50),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
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
    this.camera.position.set(10, 10, 20);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5).normalize();
    this.scene.add(ambientLight, directionalLight);

    // Load and add the .obj file
    const loader = new OBJLoader();
    loader.load(
      this.data.url,
      (object) => {
        object.scale.set(0.5, 0.5, 0.5);
        object.position.set(0, 0, 0);
        object.rotation.x = Math.PI;
        object.rotation.y = Math.PI;
        this.scene.add(object);
        this.animate();
      },
      undefined,
      (error) => console.error('Error loading .obj file:', error)
    );

    // Add OrbitControls for interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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

