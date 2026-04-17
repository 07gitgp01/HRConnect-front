import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestProjetsComponent } from './gest-projets.component';

describe('GestProjetsComponent', () => {
  let component: GestProjetsComponent;
  let fixture: ComponentFixture<GestProjetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestProjetsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GestProjetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
