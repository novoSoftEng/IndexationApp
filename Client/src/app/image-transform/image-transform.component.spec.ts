import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageTransformComponent } from './image-transform.component';

describe('ImageTransformComponent', () => {
  let component: ImageTransformComponent;
  let fixture: ComponentFixture<ImageTransformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageTransformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ImageTransformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
