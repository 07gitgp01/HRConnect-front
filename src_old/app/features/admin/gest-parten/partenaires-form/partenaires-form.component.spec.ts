import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartenairesFormComponent } from './partenaires-form.component';

describe('PartenairesFormComponent', () => {
  let component: PartenairesFormComponent;
  let fixture: ComponentFixture<PartenairesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PartenairesFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PartenairesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
