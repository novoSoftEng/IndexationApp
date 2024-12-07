import { Component, inject, Input, model } from '@angular/core';
import { MatDialogModule ,MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle } from '@angular/material/dialog';
import { GalleryComponent } from '../gallery.component';
import { ImageService } from '../../Services/image.service';
import {CdkAccordionModule} from '@angular/cdk/accordion';
import { Chart } from 'chart.js';
import {MatExpansionModule} from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [CommonModule,MatDialogModule,MatExpansionModule],
  templateUrl: './image-dialog.component.html',
  styleUrl: './image-dialog.component.css'
})
export class ImageDialogComponent {
  chart: Chart<"bar", any, unknown> | undefined;
  constructor (private imageService: ImageService){

    this.imageService.getImageDetails(this.data.image).subscribe(
      (d)=>{
        // Extracting characteristics from the response
    this.data.characteristics = d.image[0].characteristics;
    this.data.category = d.image[0].category;

    // Logging the characteristics data
    console.log("Data of characteristics:", this.data.characteristics);
    if (this.data.characteristics.color_histogram) {
      this.createColorHistogramChart();
    }
    if (this.data.characteristics.dominant_colors) {
      this.createDominantColorsChart();
    }
      }
    );

    
  }

  readonly dialogRef = inject(MatDialogRef<GalleryComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);

  onNoClick(): void {
    this.dialogRef.close();
  }
  // Download the image
  downloadImage(): void {
    const link = document.createElement('a');
    link.href = this.data.url; // URL of the image
    link.download = this.data.image; // Suggested file name
    link.click();
  }

  // Trigger delete action
  deleteImage(): void {
    // Emit or handle the deletion process
    console.log('Delete action triggered for:', this.data.image);
    this.imageService.deleteFile(this.data.image).subscribe((msg)=>{
      console.log("image deleted",msg.message);
    })

    this.dialogRef.close({ action: 'delete', image: this.data.image });
  }
  createColorHistogramChart() {
    const colorHistogram = this.data.characteristics.color_histogram;
    const labels = Array.from({ length: colorHistogram.length }, (_, i) => `Bin ${i + 1}`);
    const data = colorHistogram.flat();

    const canvas: HTMLCanvasElement | null = document.querySelector('#color-histogram-canvas');
    if (canvas) {
      this.chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Color Histogram',
            data: data,
            backgroundColor: 'rgba(0, 123, 255, 0.5)',
            borderColor: 'rgba(0, 123, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } else {
      console.error('Canvas for color histogram chart not found.');
    }
  }

  createDominantColorsChart() {
    const dominantColors = this.data.characteristics.dominant_colors;
    const colors = dominantColors.map((color: number[]) => `rgb(${color.join(',')})`);
    const data = dominantColors.map(() => 1);

    const canvas: HTMLCanvasElement | null = document.querySelector('#dominant-colors-canvas');
    if (canvas) {
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels: colors,
          datasets: [{
            data: data,
            backgroundColor: colors
          }]
        }
      });
    } else {
      console.error('Canvas for dominant colors chart not found.');
    }
  }
}
