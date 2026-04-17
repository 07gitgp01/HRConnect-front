import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionVolontairesComponent } from './gestion-volontaires.component';

describe('GestionVolontairesComponent', () => {
  let component: GestionVolontairesComponent;
  let fixture: ComponentFixture<GestionVolontairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestionVolontairesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GestionVolontairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
