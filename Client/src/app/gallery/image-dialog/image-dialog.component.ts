import { AfterViewInit, Component, inject, Input, model } from '@angular/core';
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

  constructor(private imageService: ImageService) {}

  ngAfterViewInit(): void {
    this.imageService.getImageDetails(this.data.image).subscribe((d) => {
      // Extracting characteristics from the response
      this.data.characteristics = d.image[0]?.characteristics || {};
      this.data.category = d.image[0]?.category || 'Unknown';

      console.log('Characteristics:', this.data.characteristics);

      // Create charts if characteristics are available
      if (this.data.characteristics.color_histogram) {
        setTimeout(() => this.createColorHistogramChart(), 0);
      }
      if (this.data.characteristics.dominant_colors) {
        setTimeout(() => this.createDominantColorsChart(), 0);
      }
      setTimeout(() =>this.showAverageColor(), 0);
      setTimeout(() =>this.createHuMomentsChart(), 0);
      setTimeout(() =>this.createEdgeHistogramChart(), 0);
      setTimeout(() =>this.createTextureDescriptorsChart(), 0);
    });
  }

  createColorHistogramChart() {
    const colorHistogram = this.data.characteristics.color_histogram; // 3D array: [Red, Green, Blue]
    if (
      !Array.isArray(colorHistogram) ||
      colorHistogram.length !== 3 ||
      !Array.isArray(colorHistogram[0])
    ) {
      console.error('Invalid colorHistogram structure. Expected a 3D array with 3 channels.');
      return;
    }
  
    const labels = Array.from(
      { length: colorHistogram[0].length },
      (_, i) => `${i + 1}`
    );
  
    const colors = ['rgba(0, 0, 255, 1)', 'rgba(0, 255, 0, 1)', 'rgba(255, 0, 0, 1)']; // RGB colors
    const backgroundColors = [
      'rgba(0, 0, 255, 0.2)',
      'rgba(0, 255, 0, 0.2)',
      'rgba(255, 0, 0, 0.2)'
      ,
    ];
  
    const datasets = colorHistogram.map((channelData: number[], index: number) => ({
      label: ['Blue', 'Green', 'Red'][index],
      data: channelData,
      borderColor: colors[index],
      backgroundColor: backgroundColors[index],
      borderWidth: 1,
      fill: false, // Do not fill under the line
    }));
  
    const canvas = document.getElementById(
      'color-histogram-canvas'
    ) as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets,
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Bins',
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Frequency',
              },
            },
          },
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      });
    } else {
      console.error('Canvas for color histogram chart not found.');
    }
  }
  
  createDominantColorsChart() {
    const dominantColors = this.data.characteristics.dominant_colors;
    const colors = dominantColors.map((color: number[]) => `rgb(${color.join(',')})`);
    const data = dominantColors.map(() => 1);

    const canvas = document.getElementById('dominant-colors-canvas') as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels: colors,
          datasets: [
            {
              data: data,
              backgroundColor: colors,
            },
          ],
        },
      });
    } else {
      console.error('Canvas for dominant colors chart not found.');
    }
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
    this.dialogRef.close({ action: 'delete', image: this.data.image });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
   showAverageColor() {
    // Assuming average_color is an array of numbers representing RGB components
    const { average_color } = this.data.characteristics;
  
    if (average_color && average_color.length === 3) {
      // Extract RGB values
      const [r, g, b] = average_color;
  
      // Create a CSS color string from RGB values
      const colorString = `rgb(${r}, ${g}, ${b})`;
  
      // Get the target div element
      const colorDisplay = document.getElementById('average-color-display') as HTMLDivElement;
  
      if (colorDisplay) {
        // Apply the color to the div background
        colorDisplay.style.backgroundColor = colorString;
      } else {
        console.error('Element with ID "average-color-display" not found.');
      }
    } else {
      console.error('Invalid average_color data.');
    }
  }
  
  createHuMomentsChart() {
    const huMoments = this.data.characteristics.hu_moments;
    const labels = Array.from({ length: huMoments.length }, (_, i) => `Moment ${i + 1}`);
  
    const canvas = document.getElementById('hu-moments-canvas') as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Hu Moments',
              data: huMoments,
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Value',
              },
            },
          },
        },
      });
    } else {
      console.error('Canvas for Hu Moments chart not found.');
    }
  }
  
   createEdgeHistogramChart() {
    const edgeHistogram = this.data.characteristics.edge_histogram;
    const labels = Array.from({ length: edgeHistogram.length }, (_, i) => `Bin ${i + 1}`);
  
    const canvas = document.getElementById('edge-histogram-canvas') as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Edge Histogram',
              data: edgeHistogram,
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Frequency',
              },
            },
          },
        },
      });
    } else {
      console.error('Canvas for Edge Histogram chart not found.');
    }
  }
  
   createTextureDescriptorsChart() {
    const textureDescriptors = this.data.characteristics.texture_descriptors;
    const labels = Array.from({ length: textureDescriptors.length }, (_, i) => `Descriptor ${i + 1}`);
  
    const canvas = document.getElementById('texture-descriptors-canvas') as HTMLCanvasElement;
    if (canvas) {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Texture Descriptors',
              data: textureDescriptors,
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Value',
              },
            },
          },
        },
      });
    } else {
      console.error('Canvas for Texture Descriptors chart not found.');
    }
  }
}
  
  

