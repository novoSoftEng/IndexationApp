import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageService } from '../Services/image.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
@Component({
  selector: 'app-image-transform',
  standalone: true,
  imports: [CommonModule,HttpClientModule,FormsModule],
  templateUrl: './image-transform.component.html',
  styleUrl: './image-transform.component.css'
})
export class ImageTransformComponent {
  @ViewChild('originalCanvas', { static: true }) originalCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('transformedCanvas', { static: false }) transformedCanvas!: ElementRef<HTMLCanvasElement>;

  originalFile: File | null = null;
  reductionRate: number = 0.5;

  private originalScene!: THREE.Scene;
  private transformedScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private originalRenderer!: THREE.WebGLRenderer;
  private transformedRenderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  constructor(private imageService: ImageService) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.originalFile = input.files[0];
      this.loadOBJFile(this.originalFile, this.originalCanvas.nativeElement, true);
    }
  }

  transformFile(): void {
    if (this.originalFile && this.reductionRate) {
      this.imageService.Transform(this.originalFile, this.reductionRate).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.loadOBJFileFromUrl(url, this.transformedCanvas.nativeElement);
        },
        error: (err) => console.error('Transformation error:', err),
      });
    }
  }

  private loadOBJFile(file: File, canvas: HTMLCanvasElement, isOriginal: boolean): void {
    const loader = new OBJLoader();
    const fileUrl = URL.createObjectURL(file);

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.initializeScene(scene, renderer, canvas);

    loader.load(
      fileUrl,
      (object) => {
        object.scale.set(0.5, 0.5, 0.5);
        object.position.set(0, 0, 0);
        scene.add(object);
      },
      undefined,
      (error) => console.error('Error loading OBJ file:', error)
    );

    if (isOriginal) {
      this.originalScene = scene;
      this.originalRenderer = renderer;
    } else {
      this.transformedScene = scene;
      this.transformedRenderer = renderer;
    }

    this.animate(renderer, scene);
  }

  private loadOBJFileFromUrl(url: string, canvas: HTMLCanvasElement): void {
    const loader = new OBJLoader();

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.initializeScene(scene, renderer, canvas);

    loader.load(
      url,
      (object) => {
        object.scale.set(0.5, 0.5, 0.5);
        object.position.set(0, 0, 0);
        scene.add(object);
      },
      undefined,
      (error) => console.error('Error loading transformed OBJ file:', error)
    );

    this.transformedScene = scene;
    this.transformedRenderer = renderer;

    this.animate(renderer, scene);
  }

  private initializeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): void {
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    this.camera = camera;
    this.controls = controls;
  }

  private animate(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const animateLoop = () => {
      requestAnimationFrame(animateLoop);
      this.controls.update();
      renderer.render(scene, this.camera);
    };
    animateLoop();
  }
}