import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartenairesListComponent } from './partenaires-list.component';

describe('PartenairesListComponent', () => {
  let component: PartenairesListComponent;
  let fixture: ComponentFixture<PartenairesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PartenairesListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PartenairesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
