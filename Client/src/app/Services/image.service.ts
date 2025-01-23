import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../environment';
import { SearchResults } from '../interfaces/search-results';
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private categorySubject = new BehaviorSubject<string | null>(null); // Stores the selected category
  selectedCategory$ = this.categorySubject.asObservable(); // Exposes the observable
  private apiUrl = `${environment.apiUrl}`;  // Assuming the backend is hosted at apiUrl
  private searchApi = `${environment.searchApi}`;

  constructor(private http: HttpClient) {}

  // 1. Upload images with thumbnails
uploadImages(filesWithThumbnails: { objFile: File; thumbnail?: File }[], category: string | null): Observable<any> {
  const formData: FormData = new FormData();

  // Append each .obj file and its corresponding thumbnail to the FormData object
  filesWithThumbnails.forEach(({ objFile, thumbnail }) => {
    formData.append('objFiles', objFile, objFile.name);
    if (thumbnail) {
      formData.append('thumbnails', thumbnail, thumbnail.name); // Append thumbnail with the same name
    }
  });

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
  setSelectedCategory(category: string): void {
    this.categorySubject.next(category); // Updates the selected category
  }

  getImagesByCat(cat : string ): Observable<any> {

    return this.http.get<any>(`${this.apiUrl}/images/category/${cat}`);
  }
  getAllImagesDetails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images`);
  }
  getImageDetails(filename: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/images/${filename}`);
  }
  Search(file: File,characteristics?:any) : Observable<SearchResults[]> {
    const formData: FormData = new FormData();
    
    // Append each file to the FormData object
    formData.append('file', file, file.name);
    if(characteristics){
      formData.append('characteristics',JSON.stringify(characteristics))
    }
    console.log(formData);
    
    return this.http.post<any>(`${this.searchApi}/search`, formData);
  }
  Transform(file: File, reductionRate: number): Observable<Blob> {
    const formData = new FormData();
    formData.append('object', file);
    formData.append('reduction_rate', reductionRate.toString());
  
    // Set the expected response type to 'blob' to handle file downloads
    return this.http.post(`${this.searchApi}/transform`, formData, {
      responseType: 'blob', // Expect a binary file response
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Handles HTTP errors.
   * @param error The HTTP error response.
   * @returns An Observable with an error message.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage = `Server returned code ${error.status}, message: ${error.message}`;
    }
    return throwError(errorMessage);
  }
  
}
