import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestCandiComponent } from './gest-candi.component';

describe('GestCandiComponent', () => {
  let component: GestCandiComponent;
  let fixture: ComponentFixture<GestCandiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestCandiComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GestCandiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
