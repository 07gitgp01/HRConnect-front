import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionRapportsComponent } from './gestion-rapports.component';

describe('GestionRapportsComponent', () => {
  let component: GestionRapportsComponent;
  let fixture: ComponentFixture<GestionRapportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestionRapportsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GestionRapportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
