import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestPartenComponent } from './gest-parten.component';

describe('GestPartenComponent', () => {
  let component: GestPartenComponent;
  let fixture: ComponentFixture<GestPartenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestPartenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GestPartenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
