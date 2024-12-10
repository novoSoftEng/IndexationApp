import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../environment';
import { SearchResults } from '../interfaces/search-results';
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = `${environment.apiUrl}`;  // Assuming the backend is hosted at apiUrl
  private searchApi = `${environment.searchApi}`;

  constructor(private http: HttpClient) {}

  // 1. Upload images
  uploadImages(files: File[], category: string | null): Observable<any> {
    const formData: FormData = new FormData();
    
    // Append each file to the FormData object
    files.forEach(file => formData.append('images', file, file.name));
    
    // Append the category if provided
    if (category) {
      formData.append('category', category);
    }
  
    // Send the POST request
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

// 2. Download a specific file (by filename)
downloadFile(filename: string): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/download/${filename}`, {
    responseType: 'blob'  // Ensure the response is of type Blob
    });
}


  // 3. Delete a specific file (by filename)
  deleteFile(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${filename}`);
  }

  // 4. Get a list of all images
  getAllImages(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/download`);
  }

  // 5. Get a specific image (by filename)
  getImage(filename: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/download/${filename}`);
  }
  getAllImagesDetails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images`);
  }
  getImageDetails(filename: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images/${filename}`);
  }
  Search(file: File) : Observable<SearchResults[]> {
    const formData: FormData = new FormData();
    
    // Append each file to the FormData object
    formData.append('image', file, file.name);
    console.log(formData);
    
    return this.http.post<any>(`${this.searchApi}/search`, formData);
  }
  Transform(file: File, cropCoords?: string, resizeDims?: string, flip?: string, rotateAngle?: string): Observable<Blob> {
    const formData: FormData = new FormData();
    
    // Append each transformation parameter if available
    formData.append('image', file, file.name);
    if (cropCoords) {
      formData.append('crop_coords', cropCoords);
    }
    if (resizeDims) {
      formData.append('resize_dims', resizeDims);
    }
    if (flip) {
      formData.append('flip', flip);
    }
    if (rotateAngle) {
      formData.append('rotate_angle', rotateAngle);
    }

    // Perform HTTP POST request to the server API
    return this.http.post<Blob>(`${this.searchApi}/transform`, formData, { responseType: 'blob' as 'json' });
  }
}
