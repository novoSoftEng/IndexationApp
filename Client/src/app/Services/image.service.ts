import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environment';
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = `${environment.apiUrl}`;  // Assuming the backend is hosted at apiUrl

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
      responseType: 'blob'
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
    return this.http.get<any>(`${this.apiUrl}/dowload/${filename}`);
  }
  getAllImagesDetails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images`);
  }
  getImageDetails(filename: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images/${filename}`);
  }
}
