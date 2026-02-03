import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolontairesListComponent } from './volontaires-list.component';

describe('VolontairesListComponent', () => {
  let component: VolontairesListComponent;
  let fixture: ComponentFixture<VolontairesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VolontairesListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VolontairesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
