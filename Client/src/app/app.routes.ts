import { Routes } from '@angular/router';
import { GalleryComponent } from './gallery/gallery.component';
import { UploadComponent } from './upload/upload.component';
import { ImageTransformComponent } from './image-transform/image-transform.component';
import { SearchComponent } from './search/search.component';

export const routes: Routes = [
    { path: '', component: GalleryComponent },
    { path: 'upload', component: UploadComponent },
    { path: 'transform', component: ImageTransformComponent },
    { path: 'search', component: SearchComponent }
];
