import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjetsDisponiblesComponent } from './projets-disponibles.component';

describe('ProjetsDisponiblesComponent', () => {
  let component: ProjetsDisponiblesComponent;
  let fixture: ComponentFixture<ProjetsDisponiblesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjetsDisponiblesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjetsDisponiblesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
